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
  icon_url: string | null
  position: number
  created_at: string
}

interface CreateBookmarkBody {
  name: string
  url: string
}

interface PatchBookmarkBody {
  name?: string
  url?: string
  position?: number
}

interface UploadIconBody {
  data: string
  content_type: string
}

export async function bookmarksRoutes(app: FastifyInstance) {
  const db = getDb()

  // GET /api/bookmarks — all authenticated users
  app.get('/api/bookmarks', { preHandler: [app.authenticate] }, async () => {
    return db.prepare('SELECT * FROM bookmarks ORDER BY position, created_at').all() as BookmarkRow[]
  })

  // POST /api/bookmarks — admin only
  app.post<{ Body: CreateBookmarkBody }>('/api/bookmarks', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const { name, url } = req.body
    if (!name?.trim()) return reply.status(400).send({ error: 'name is required' })
    if (!url?.trim()) return reply.status(400).send({ error: 'url is required' })
    const maxRow = db.prepare('SELECT MAX(position) as m FROM bookmarks').get() as { m: number | null }
    const position = (maxRow.m ?? -1) + 1
    const id = nanoid()
    db.prepare('INSERT INTO bookmarks (id, name, url, position) VALUES (?, ?, ?, ?)').run(id, name.trim(), url.trim(), position)
    return reply.status(201).send(db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(id) as BookmarkRow)
  })

  // PATCH /api/bookmarks/:id — admin only
  app.patch<{ Params: { id: string }; Body: PatchBookmarkBody }>('/api/bookmarks/:id', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const row = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(req.params.id) as BookmarkRow | undefined
    if (!row) return reply.status(404).send({ error: 'Not found' })
    const { name, url, position } = req.body
    const updates: string[] = []
    const values: unknown[] = []
    if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()) }
    if (url !== undefined) { updates.push('url = ?'); values.push(url.trim()) }
    if (position !== undefined) { updates.push('position = ?'); values.push(position) }
    if (updates.length > 0) {
      db.prepare(`UPDATE bookmarks SET ${updates.join(', ')} WHERE id = ?`).run(...values, req.params.id)
    }
    return db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(req.params.id) as BookmarkRow
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
