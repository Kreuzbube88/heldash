import { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'
import { getDb, safeJson } from '../db/database'
import { isValidHttpUrl } from './_helpers'
import { invalidateHaWsClient, ensureHaWsPersistent } from '../clients/ha-ws-manager'
import { logActivity } from './activity'

// ── Types ─────────────────────────────────────────────────────────────────────

type InstanceType = 'ha' | 'radarr' | 'sonarr' | 'prowlarr' | 'sabnzbd' | 'seerr' | 'unraid' | 'helbackup'

interface InstanceRow {
  id: string
  type: InstanceType
  name: string
  url: string
  config: string  // JSON
  enabled: number
  position: number
  icon_id: string | null
  created_at: string
  updated_at: string
}

interface CreateInstanceBody {
  type: InstanceType
  name: string
  url: string
  token?: string   // HA only
  api_key?: string // Arr / Unraid
  enabled?: boolean
  icon_id?: string | null
}

interface PatchInstanceBody {
  name?: string
  url?: string
  token?: string
  api_key?: string
  enabled?: boolean
  icon_id?: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitize(r: InstanceRow) {
  return {
    id: r.id,
    type: r.type,
    name: r.name,
    url: r.url,
    enabled: r.enabled === 1,
    position: r.position,
    icon_id: r.icon_id ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

const HA_TYPES: InstanceType[] = ['ha']
const ARR_TYPES: InstanceType[] = ['radarr', 'sonarr', 'prowlarr', 'sabnzbd', 'seerr']
const UNRAID_TYPES: InstanceType[] = ['unraid']
const HELBACKUP_TYPES: InstanceType[] = ['helbackup']
const TOKEN_TYPES: InstanceType[] = [...HA_TYPES, ...HELBACKUP_TYPES]
const ALL_TYPES: InstanceType[] = [...HA_TYPES, ...ARR_TYPES, ...UNRAID_TYPES, ...HELBACKUP_TYPES]

// ── Test connection ───────────────────────────────────────────────────────────

async function testConnection(type: InstanceType, url: string, config: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  const base = url.replace(/\/$/, '')
  const timeout = AbortSignal.timeout(5000)
  try {
    if (HA_TYPES.includes(type)) {
      const res = await fetch(`${base}/api/`, {
        headers: { Authorization: `Bearer ${config.token ?? ''}` },
        signal: timeout,
      })
      return res.ok ? { ok: true } : { ok: false, error: `HA returned HTTP ${res.status}` }
    }
    if (type === 'sabnzbd') {
      const res = await fetch(`${base}/api?mode=version&apikey=${encodeURIComponent(config.api_key ?? '')}&output=json`, {
        signal: timeout,
      })
      return res.ok ? { ok: true } : { ok: false, error: `SABnzbd returned HTTP ${res.status}` }
    }
    if (type === 'seerr') {
      const res = await fetch(`${base}/api/v1/status`, {
        headers: { 'X-Api-Key': config.api_key ?? '' },
        signal: timeout,
      })
      return res.ok ? { ok: true } : { ok: false, error: `Seerr returned HTTP ${res.status}` }
    }
    if (ARR_TYPES.includes(type)) {
      const res = await fetch(`${base}/api/v3/system/status`, {
        headers: { 'X-Api-Key': config.api_key ?? '' },
        signal: timeout,
      })
      return res.ok ? { ok: true } : { ok: false, error: `${type} returned HTTP ${res.status}` }
    }
    if (UNRAID_TYPES.includes(type)) {
      const res = await fetch(`${base}/graphql`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.api_key ?? ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'query { online }' }),
        signal: timeout,
      })
      return res.ok ? { ok: true } : { ok: false, error: `Unraid returned HTTP ${res.status}` }
    }
    if (HELBACKUP_TYPES.includes(type)) {
      const res = await fetch(`${base}/health`, { signal: timeout })
      return res.ok ? { ok: true } : { ok: false, error: `HELBACKUP returned HTTP ${res.status}` }
    }
    return { ok: false, error: 'Unknown instance type' }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Connection failed' }
  }
}

// ── Sync helpers — mirror writes to old tables ────────────────────────────────

function syncToOldTable(db: ReturnType<typeof getDb>, id: string, type: InstanceType, name: string, url: string, config: Record<string, string>, enabled: number, position: number) {
  if (HA_TYPES.includes(type)) {
    db.prepare(`INSERT OR REPLACE INTO ha_instances (id, name, url, token, enabled, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(id, name, url, config.token ?? '', enabled, position)
  } else if (ARR_TYPES.includes(type)) {
    db.prepare(`INSERT OR REPLACE INTO arr_instances (id, type, name, url, api_key, enabled, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(id, type, name, url, config.api_key ?? '', enabled, position)
  } else if (UNRAID_TYPES.includes(type)) {
    db.prepare(`INSERT OR REPLACE INTO unraid_instances (id, name, url, api_key, enabled, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(id, name, url, config.api_key ?? '', enabled, position)
  }
}

function deleteFromOldTable(db: ReturnType<typeof getDb>, id: string, type: InstanceType) {
  if (HA_TYPES.includes(type)) {
    db.prepare('DELETE FROM ha_panels WHERE instance_id = ?').run(id)
    db.prepare('DELETE FROM ha_instances WHERE id = ?').run(id)
  } else if (ARR_TYPES.includes(type)) {
    db.prepare('DELETE FROM group_arr_visibility WHERE instance_id = ?').run(id)
    db.prepare('DELETE FROM arr_instances WHERE id = ?').run(id)
  } else if (UNRAID_TYPES.includes(type)) {
    db.prepare('DELETE FROM unraid_instances WHERE id = ?').run(id)
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function instancesRoutes(app: FastifyInstance) {
  const db = getDb()

  // GET /api/instances
  app.get('/api/instances', { preHandler: [app.requireAdmin] }, async () => {
    const rows = db.prepare(
      'SELECT * FROM instances ORDER BY type, position, name'
    ).all() as InstanceRow[]
    return rows.map(sanitize)
  })

  // POST /api/instances
  app.post<{ Body: CreateInstanceBody }>('/api/instances', {
    preHandler: [app.requireAdmin],
  }, async (req, reply) => {
    const { type, name, url, enabled = true } = req.body
    if (!ALL_TYPES.includes(type)) {
      return reply.status(400).send({ error: `type must be one of: ${ALL_TYPES.join(', ')}` })
    }
    if (!name?.trim() || !url?.trim()) {
      return reply.status(400).send({ error: 'name and url are required' })
    }
    if (!isValidHttpUrl(url.trim())) {
      return reply.status(400).send({ error: 'url must be a valid http or https URL' })
    }
    if (TOKEN_TYPES.includes(type) && !req.body.token?.trim()) {
      return reply.status(400).send({ error: 'token is required for this instance type' })
    }
    if ([...ARR_TYPES, ...UNRAID_TYPES].includes(type) && !req.body.api_key?.trim()) {
      return reply.status(400).send({ error: 'api_key is required' })
    }

    const id = nanoid()
    const cleanUrl = url.trim().replace(/\/$/, '')
    const enabledInt = enabled ? 1 : 0
    const maxRow = db.prepare('SELECT MAX(position) as m FROM instances WHERE type = ?').get(type) as { m: number | null }
    const position = (maxRow.m ?? -1) + 1

    const config: Record<string, string> = {}
    if (TOKEN_TYPES.includes(type)) config.token = req.body.token!.trim()
    else config.api_key = req.body.api_key!.trim()

    const iconId = req.body.icon_id ?? null

    db.prepare(`INSERT INTO instances (id, type, name, url, config, enabled, position, icon_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, type, name.trim(), cleanUrl, JSON.stringify(config), enabledInt, position, iconId)

    syncToOldTable(db, id, type, name.trim(), cleanUrl, config, enabledInt, position)

    // Auto-create service entry if URL is not already tracked
    const existingSvc = db.prepare('SELECT id FROM services WHERE url = ?').get(cleanUrl) as { id: string } | undefined
    if (!existingSvc) {
      const svcId = nanoid()
      db.prepare('INSERT INTO services (id, name, url, icon_id) VALUES (?, ?, ?, ?)')
        .run(svcId, name.trim(), cleanUrl, iconId)
    }

    if (HA_TYPES.includes(type)) {
      const widgetId = nanoid()
      const wMax = db.prepare('SELECT MAX(position) as m FROM widgets').get() as { m: number | null }
      db.prepare(`INSERT INTO widgets (id, type, name, config, position, show_in_topbar, display_location) VALUES (?, 'home_assistant', ?, ?, ?, 0, 'sidebar')`)
        .run(widgetId, name.trim(), JSON.stringify({ instance_id: id, entities: [] }), (wMax.m ?? -1) + 1)
    }

    if (HELBACKUP_TYPES.includes(type)) {
      const widgetId = nanoid()
      const wMax = db.prepare('SELECT MAX(position) as m FROM widgets').get() as { m: number | null }
      db.prepare(`INSERT INTO widgets (id, type, name, config, position, show_in_topbar, display_location) VALUES (?, 'helbackup', ?, ?, ?, 0, 'none')`)
        .run(widgetId, name.trim(), JSON.stringify({ instance_id: id }), (wMax.m ?? -1) + 1)
    }

    if (HA_TYPES.includes(type) && enabled) {
      ensureHaWsPersistent(id, cleanUrl, config.token!)
    }

    const row = db.prepare('SELECT * FROM instances WHERE id = ?').get(id) as InstanceRow
    logActivity('system', `Instanz "${name.trim()}" (${type}) hinzugefügt`, 'info', { instanceId: id })
    return reply.status(201).send(sanitize(row))
  })

  // PATCH /api/instances/:id
  app.patch<{ Params: { id: string }; Body: PatchInstanceBody }>('/api/instances/:id', {
    preHandler: [app.requireAdmin],
  }, async (req, reply) => {
    const row = db.prepare('SELECT * FROM instances WHERE id = ?').get(req.params.id) as InstanceRow | undefined
    if (!row) return reply.status(404).send({ error: 'Not found' })

    const config = safeJson<Record<string, string>>(row.config, {} as Record<string, string>)
    const name = req.body.name?.trim() ?? row.name
    const url = (req.body.url?.trim() ?? row.url).replace(/\/$/, '')
    if (req.body.url !== undefined && !isValidHttpUrl(url)) {
      return reply.status(400).send({ error: 'url must be a valid http or https URL' })
    }
    const enabled = req.body.enabled !== undefined ? (req.body.enabled ? 1 : 0) : row.enabled
    const newIconId = req.body.icon_id !== undefined ? req.body.icon_id : (row.icon_id ?? null)
    const urlChanged = req.body.url !== undefined && url !== row.url

    if (TOKEN_TYPES.includes(row.type)) {
      config.token = req.body.token?.trim() || config.token
    } else {
      if (req.body.api_key?.trim()) config.api_key = req.body.api_key.trim()
    }

    db.prepare(`UPDATE instances SET name=?, url=?, config=?, enabled=?, icon_id=?, updated_at=datetime('now') WHERE id=?`)
      .run(name, url, JSON.stringify(config), enabled, newIconId, row.id)

    syncToOldTable(db, row.id, row.type, name, url, config, enabled, row.position)

    if (HA_TYPES.includes(row.type) && req.body.name) {
      db.prepare(`UPDATE widgets SET name = ? WHERE type = 'home_assistant' AND json_extract(config, '$.instance_id') = ?`)
        .run(name, row.id)
    }
    if (HELBACKUP_TYPES.includes(row.type) && req.body.name) {
      db.prepare(`UPDATE widgets SET name = ? WHERE type = 'helbackup' AND json_extract(config, '$.instance_id') = ?`)
        .run(name, row.id)
    }

    // Auto-create service entry if URL changed and new URL is not already tracked
    if (urlChanged) {
      const existingSvc = db.prepare('SELECT id FROM services WHERE url = ?').get(url) as { id: string } | undefined
      if (!existingSvc) {
        const svcId = nanoid()
        db.prepare('INSERT INTO services (id, name, url, icon_id) VALUES (?, ?, ?, ?)')
          .run(svcId, name, url, newIconId)
      }
    }

    if (HA_TYPES.includes(row.type)) {
      invalidateHaWsClient(row.id)
      if (enabled) ensureHaWsPersistent(row.id, url, config.token!)
    }

    const updated = db.prepare('SELECT * FROM instances WHERE id = ?').get(row.id) as InstanceRow
    logActivity('system', `Instanz "${updated.name}" (${row.type}) aktualisiert`, 'info', { instanceId: row.id })
    return sanitize(updated)
  })

  // DELETE /api/instances/:id
  app.delete<{ Params: { id: string } }>('/api/instances/:id', {
    preHandler: [app.requireAdmin],
  }, async (req, reply) => {
    const row = db.prepare('SELECT * FROM instances WHERE id = ?').get(req.params.id) as InstanceRow | undefined
    if (!row) return reply.status(404).send({ error: 'Not found' })

    if (HA_TYPES.includes(row.type)) {
      db.prepare(`DELETE FROM widgets WHERE type = 'home_assistant' AND json_extract(config, '$.instance_id') = ?`)
        .run(row.id)
    }
    if (HELBACKUP_TYPES.includes(row.type)) {
      db.prepare(`DELETE FROM widgets WHERE type = 'helbackup' AND json_extract(config, '$.instance_id') = ?`)
        .run(row.id)
    }

    deleteFromOldTable(db, row.id, row.type)
    db.prepare('DELETE FROM instances WHERE id = ?').run(row.id)

    if (HA_TYPES.includes(row.type)) {
      invalidateHaWsClient(row.id)
    }

    logActivity('system', `Instanz "${row.name}" (${row.type}) gelöscht`, 'warning', { instanceId: row.id })
    return reply.status(204).send()
  })

  // POST /api/instances/:id/test
  app.post<{ Params: { id: string } }>('/api/instances/:id/test', {
    preHandler: [app.requireAdmin],
  }, async (req, reply) => {
    const row = db.prepare('SELECT * FROM instances WHERE id = ?').get(req.params.id) as InstanceRow | undefined
    if (!row) return reply.status(404).send({ error: 'Not found' })
    const config = safeJson<Record<string, string>>(row.config, {} as Record<string, string>)
    return testConnection(row.type, row.url, config)
  })

  // POST /api/instances/reorder
  app.post<{ Body: { ids: string[] } }>('/api/instances/reorder', {
    preHandler: [app.requireAdmin],
  }, async (req, reply) => {
    const { ids } = req.body
    if (!Array.isArray(ids)) return reply.status(400).send({ error: 'ids required' })
    const stmt = db.prepare("UPDATE instances SET position = ?, updated_at = datetime('now') WHERE id = ?")
    ids.forEach((id, idx) => stmt.run(idx, id))
    return { ok: true }
  })
}
