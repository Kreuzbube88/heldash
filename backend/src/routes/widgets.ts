import { FastifyInstance, FastifyRequest } from 'fastify'
import { nanoid } from 'nanoid'
import { promises as fsp } from 'fs'
import { getDb } from '../db/database'

// ── DB row types ──────────────────────────────────────────────────────────────
interface WidgetRow {
  id: string
  type: string
  name: string
  config: string
  position: number
  show_in_topbar: number
  created_at: string
  updated_at: string
}

// ── Request body types ────────────────────────────────────────────────────────
interface CreateWidgetBody {
  type: string
  name: string
  config?: Record<string, unknown>
  show_in_topbar?: boolean
}

interface PatchWidgetBody {
  name?: string
  config?: Record<string, unknown>
  show_in_topbar?: boolean
  position?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitize(r: WidgetRow) {
  return {
    id: r.id,
    type: r.type,
    name: r.name,
    config: JSON.parse(r.config ?? '{}'),
    position: r.position,
    show_in_topbar: r.show_in_topbar === 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

async function callerGroupId(req: FastifyRequest): Promise<string | null> {
  try {
    await req.jwtVerify()
    if (req.user.role === 'admin') return null
    return req.user.groupId ?? 'grp_guest'
  } catch {
    return 'grp_guest'
  }
}

// ── System stats helpers (Linux /proc + fs.statfs) ────────────────────────────

function parseProcStat(raw: string): { total: number; idle: number } {
  // First line: "cpu  user nice system idle iowait irq softirq steal ..."
  const line = raw.split('\n')[0]
  const parts = line.trim().split(/\s+/).slice(1).map(Number)
  const idle = parts[3] + (parts[4] ?? 0)       // idle + iowait
  const total = parts.reduce((a, b) => a + b, 0)
  return { total, idle }
}

async function getCpuLoad(): Promise<number> {
  try {
    const raw1 = await fsp.readFile('/proc/stat', 'utf8')
    const s1 = parseProcStat(raw1)
    await new Promise(r => setTimeout(r, 200))
    const raw2 = await fsp.readFile('/proc/stat', 'utf8')
    const s2 = parseProcStat(raw2)
    const dTotal = s2.total - s1.total
    const dIdle = s2.idle - s1.idle
    if (dTotal === 0) return 0
    return Math.round(((dTotal - dIdle) / dTotal) * 1000) / 10  // one decimal
  } catch {
    return -1
  }
}

async function getRam(): Promise<{ total: number; used: number; free: number }> {
  try {
    const raw = await fsp.readFile('/proc/meminfo', 'utf8')
    const getValue = (key: string): number => {
      const match = raw.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'))
      return match ? parseInt(match[1], 10) : 0
    }
    const totalKb = getValue('MemTotal')
    const availKb = getValue('MemAvailable')
    const total = Math.round(totalKb / 1024)
    const free = Math.round(availKb / 1024)
    const used = total - free
    return { total, used, free }
  } catch {
    return { total: 0, used: 0, free: 0 }
  }
}

interface DiskConfig { path: string; name: string }
interface DiskStats extends DiskConfig { total: number; used: number; free: number }

async function getDiskStats(disks: DiskConfig[]): Promise<DiskStats[]> {
  return Promise.all(disks.map(async disk => {
    try {
      const stat = await fsp.statfs(disk.path)
      const blockSize = stat.bsize
      const total = Math.round((stat.blocks * blockSize) / (1024 * 1024))
      const free = Math.round((stat.bavail * blockSize) / (1024 * 1024))
      const used = total - free
      return { path: disk.path, name: disk.name, total, used, free }
    } catch {
      return { path: disk.path, name: disk.name, total: 0, used: 0, free: 0 }
    }
  }))
}

// ── Routes ────────────────────────────────────────────────────────────────────
export async function widgetsRoutes(app: FastifyInstance) {
  const db = getDb()

  // GET /api/widgets — filtered by group visibility
  app.get('/api/widgets', async (req) => {
    const groupId = await callerGroupId(req)
    const all = db.prepare('SELECT * FROM widgets ORDER BY position, created_at').all() as WidgetRow[]
    if (groupId === null) return all.map(sanitize)
    const hidden = new Set(
      (db.prepare('SELECT widget_id FROM group_widget_visibility WHERE group_id = ?').all(groupId) as { widget_id: string }[])
        .map(r => r.widget_id)
    )
    return all.filter(r => !hidden.has(r.id)).map(sanitize)
  })

  // POST /api/widgets — create (admin only)
  app.post('/api/widgets', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const { type, name, config = {}, show_in_topbar = false } = req.body as CreateWidgetBody
    if (!['server_status'].includes(type)) {
      return reply.status(400).send({ error: 'Invalid widget type' })
    }
    if (!name?.trim()) return reply.status(400).send({ error: 'name is required' })
    const maxRow = db.prepare('SELECT MAX(position) as m FROM widgets').get() as { m: number | null }
    const position = (maxRow.m ?? -1) + 1
    const id = nanoid()
    db.prepare(`
      INSERT INTO widgets (id, type, name, config, position, show_in_topbar)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, type, name.trim(), JSON.stringify(config), position, show_in_topbar ? 1 : 0)
    const row = db.prepare('SELECT * FROM widgets WHERE id = ?').get(id) as WidgetRow
    return reply.status(201).send(sanitize(row))
  })

  // PATCH /api/widgets/:id — update (admin only)
  app.patch('/api/widgets/:id', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const row = db.prepare('SELECT * FROM widgets WHERE id = ?').get(id) as WidgetRow | undefined
    if (!row) return reply.status(404).send({ error: 'Not found' })
    const { name, config, show_in_topbar, position } = req.body as PatchWidgetBody
    db.prepare(`
      UPDATE widgets SET
        name           = COALESCE(?, name),
        config         = COALESCE(?, config),
        show_in_topbar = COALESCE(?, show_in_topbar),
        position       = COALESCE(?, position),
        updated_at     = datetime('now')
      WHERE id = ?
    `).run(
      name?.trim() ?? null,
      config !== undefined ? JSON.stringify(config) : null,
      show_in_topbar !== undefined ? (show_in_topbar ? 1 : 0) : null,
      position ?? null,
      id
    )
    const updated = db.prepare('SELECT * FROM widgets WHERE id = ?').get(id) as WidgetRow
    return sanitize(updated)
  })

  // DELETE /api/widgets/:id — delete + cascade (admin only)
  app.delete('/api/widgets/:id', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    if (!db.prepare('SELECT id FROM widgets WHERE id = ?').get(id)) {
      return reply.status(404).send({ error: 'Not found' })
    }
    db.prepare('DELETE FROM dashboard_items WHERE type = ? AND ref_id = ?').run('widget', id)
    db.prepare('DELETE FROM group_widget_visibility WHERE widget_id = ?').run(id)
    db.prepare('DELETE FROM widgets WHERE id = ?').run(id)
    return reply.status(204).send()
  })

  // GET /api/widgets/:id/stats — live system stats (visibility not required for stats)
  app.get('/api/widgets/:id/stats', async (req, reply) => {
    const { id } = req.params as { id: string }
    const row = db.prepare('SELECT * FROM widgets WHERE id = ?').get(id) as WidgetRow | undefined
    if (!row) return reply.status(404).send({ error: 'Not found' })

    const config = JSON.parse(row.config ?? '{}')
    const disks: DiskConfig[] = Array.isArray(config.disks) ? config.disks : []

    const [cpu, ram, diskStats] = await Promise.all([
      getCpuLoad(),
      getRam(),
      getDiskStats(disks),
    ])

    return { cpu: { load: cpu }, ram, disks: diskStats }
  })
}
