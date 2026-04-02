import { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'
import path from 'path'
import fs from 'fs'
import { getDb } from '../db/database'

const DATA_DIR = process.env.DATA_DIR ?? '/data'

interface BookmarkRow {
  id: string
  name: string
  url: string
  description: string | null
  icon_url: string | null
  icon_id: string | null
  position: number
  show_on_dashboard: number
  created_at: string
}

interface CreateBookmarkBody {
  name: string
  url: string
  description?: string
}

interface PatchBookmarkBody {
  name?: string
  url?: string
  description?: string
  position?: number
  icon_id?: string | null
}

interface UploadIconBody {
  data: string
  content_type: string
}

interface ImportBookmarksBody {
  bookmarks: Array<{ name: string; url: string; description?: string }>
}

export async function bookmarksRoutes(app: FastifyInstance) {
  const db = getDb()

  // GET /api/bookmarks — all authenticated users
  app.get('/api/bookmarks', { preHandler: [app.authenticate] }, async () => {
    const rows = db.prepare('SELECT * FROM bookmarks ORDER BY position, created_at').all() as BookmarkRow[]
    return rows.map(r => ({ ...r, icon_url: r.icon_id ? `/api/icons/${r.icon_id}` : r.icon_url }))
  })

  // GET /api/bookmarks/export — export as JSON (must be before /:id routes)
  app.get('/api/bookmarks/export', { preHandler: [app.authenticate] }, async (_req, reply) => {
    const rows = db.prepare(
      'SELECT name, url, description, icon_url, icon_id FROM bookmarks ORDER BY name ASC'
    ).all() as Pick<BookmarkRow, 'name' | 'url' | 'description' | 'icon_url' | 'icon_id'>[]
    const date = new Date().toISOString().split('T')[0]
    reply.header('Content-Type', 'application/json')
    reply.header('Content-Disposition', `attachment; filename="heldash-bookmarks-${date}.json"`)
    return { bookmarks: rows.map(r => ({ ...r, icon_url: r.icon_id ? `/api/icons/${r.icon_id}` : r.icon_url })) }
  })

  // POST /api/bookmarks/import — import from JSON (must be before /:id routes)
  app.post<{ Body: ImportBookmarksBody }>('/api/bookmarks/import', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { bookmarks } = req.body
    if (!Array.isArray(bookmarks)) return reply.status(400).send({ error: 'bookmarks must be an array' })
    const now = new Date().toISOString()
    let imported = 0
    let skipped = 0
    const errors: string[] = []
    for (const bm of bookmarks) {
      try {
        const existing = db.prepare('SELECT id FROM bookmarks WHERE url = ?').get(bm.url)
        if (existing) { skipped++; continue }
        const maxRow = db.prepare('SELECT MAX(position) as m FROM bookmarks').get() as { m: number | null }
        const position = (maxRow.m ?? -1) + 1
        const id = nanoid()
        db.prepare(
          'INSERT INTO bookmarks (id, name, url, description, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(id, bm.name, bm.url, bm.description ?? null, position, now)
        imported++
      } catch (err) {
        errors.push(`${bm.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }
    return { imported, skipped, errors }
  })

  // POST /api/bookmarks — admin only
  app.post<{ Body: CreateBookmarkBody }>('/api/bookmarks', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const { name, url, description } = req.body
    if (!name?.trim()) return reply.status(400).send({ error: 'name is required' })
    if (!url?.trim()) return reply.status(400).send({ error: 'url is required' })
    const maxRow = db.prepare('SELECT MAX(position) as m FROM bookmarks').get() as { m: number | null }
    const position = (maxRow.m ?? -1) + 1
    const id = nanoid()
    db.prepare('INSERT INTO bookmarks (id, name, url, description, position) VALUES (?, ?, ?, ?, ?)').run(
      id, name.trim(), url.trim(), description?.trim() ?? null, position
    )
    const created = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as BookmarkRow
    return reply.status(201).send({ ...created, icon_url: created.icon_id ? `/api/icons/${created.icon_id}` : created.icon_url })
  })

  // PATCH /api/bookmarks/:id — admin only
  app.patch<{ Params: { id: string }; Body: PatchBookmarkBody }>('/api/bookmarks/:id', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const row = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(req.params.id) as BookmarkRow | undefined
    if (!row) return reply.status(404).send({ error: 'Not found' })
    const { name, url, description, position } = req.body
    const updates: string[] = []
    const values: unknown[] = []
    if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()) }
    if (url !== undefined) { updates.push('url = ?'); values.push(url.trim()) }
    if (description !== undefined) { updates.push('description = ?'); values.push(description.trim() || null) }
    if (position !== undefined) { updates.push('position = ?'); values.push(position) }
    if (req.body.icon_id !== undefined) {
      updates.push('icon_id = ?')
      values.push(req.body.icon_id ?? null)
      updates.push('icon_url = ?')
      values.push(null)
    }
    if (updates.length > 0) {
      db.prepare(`UPDATE bookmarks SET ${updates.join(', ')} WHERE id = ?`).run(...values, req.params.id)
    }
    const updated = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(req.params.id) as BookmarkRow
    return { ...updated, icon_url: updated.icon_id ? `/api/icons/${updated.icon_id}` : updated.icon_url }
  })

  // PATCH /api/bookmarks/:id/dashboard — authenticated users (toggle own visibility)
  app.patch<{ Params: { id: string }; Body: { show: boolean } }>('/api/bookmarks/:id/dashboard', { preHandler: [app.authenticate] }, async (req, reply) => {
    const row = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(req.params.id) as BookmarkRow | undefined
    if (!row) return reply.status(404).send({ error: 'Not found' })
    db.prepare('UPDATE bookmarks SET show_on_dashboard = ? WHERE id = ?').run(req.body.show ? 1 : 0, req.params.id)
    return { success: true }
  })

  // DELETE /api/bookmarks/:id — admin only
  app.delete<{ Params: { id: string } }>('/api/bookmarks/:id', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const row = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(req.params.id) as BookmarkRow | undefined
    if (!row) return reply.status(404).send({ error: 'Not found' })
    if (row.icon_url) {
      const iconPath = path.join(DATA_DIR, 'icons', path.basename(row.icon_url))
      if (fs.existsSync(iconPath)) fs.unlinkSync(iconPath)
    }
    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(req.params.id)
    return reply.status(204).send()
  })

  // POST /api/bookmarks/:id/icon — admin only
  app.post<{ Params: { id: string }; Body: UploadIconBody }>('/api/bookmarks/:id/icon', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const row = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(req.params.id) as BookmarkRow | undefined
    if (!row) return reply.status(404).send({ error: 'Not found' })
    const { data, content_type } = req.body
    if (!data || !content_type) return reply.status(400).send({ error: 'data and content_type are required' })
    const extMap: Record<string, string> = {
      'image/png': 'png', 'image/jpeg': 'jpg', 'image/svg+xml': 'svg', 'image/webp': 'webp',
    }
    const ext = extMap[content_type]
    if (!ext) return reply.status(415).send({ error: 'Unsupported image type' })
    const buffer = Buffer.from(data, 'base64')
    if (buffer.length > 512 * 1024) return reply.status(413).send({ error: 'Image too large (max 512KB)' })
    const iconsDir = path.join(DATA_DIR, 'icons')
    if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })
    if (row.icon_url) {
      const oldPath = path.join(iconsDir, path.basename(row.icon_url))
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }
    const filename = `bm_${req.params.id}.${ext}`
    fs.writeFileSync(path.join(iconsDir, filename), buffer)
    const icon_url = `/icons/${filename}`
    db.prepare('UPDATE bookmarks SET icon_url = ? WHERE id = ?').run(icon_url, req.params.id)
    return { icon_url }
  })
}
