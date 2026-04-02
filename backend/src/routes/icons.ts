import { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'
import { getDb } from '../db/database'
import { request as undiciRequest } from 'undici'

interface IconRow {
  id: string
  name: string
  source: string
  source_url: string | null
  data: Buffer
  mime_type: string
  created_at: string
}

interface MetadataEntry {
  base: 'svg' | 'png'
  aliases?: string[]
  categories?: string[]
}

let metadataCache: Record<string, MetadataEntry> | null = null
let metadataCachedAt = 0
const METADATA_TTL = 24 * 60 * 60 * 1000

async function getMetadata(): Promise<Record<string, MetadataEntry>> {
  const now = Date.now()
  if (metadataCache && now - metadataCachedAt < METADATA_TTL) return metadataCache
  const { body, statusCode } = await undiciRequest(
    'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/metadata.json',
    { headersTimeout: 10_000, bodyTimeout: 10_000 }
  )
  if (statusCode !== 200) throw new Error(`metadata fetch failed: ${statusCode}`)
  const text = await body.text()
  metadataCache = JSON.parse(text) as Record<string, MetadataEntry>
  metadataCachedAt = now
  return metadataCache
}

export async function iconsRoutes(app: FastifyInstance) {
  const db = getDb()

  // GET /api/icons/search?q=<query> — search dashboardicons metadata
  app.get<{ Querystring: { q?: string } }>(
    '/api/icons/search',
    { preHandler: [app.authenticate] },
    async (_req, reply) => {
      const q = ((_req.query as { q?: string }).q ?? '').trim().toLowerCase()
      try {
        const meta = await getMetadata()
        const results = Object.entries(meta)
          .filter(([name, entry]) => {
            if (!q) return true
            if (name.toLowerCase().includes(q)) return true
            if (entry.aliases?.some(a => a.toLowerCase().includes(q))) return true
            return false
          })
          .slice(0, 60)
          .map(([name, entry]) => ({
            name,
            base: entry.base,
            preview_url: `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/${entry.base}/${name}.${entry.base}`,
            categories: entry.categories ?? [],
          }))
        return { icons: results }
      } catch {
        return reply.status(502).send({ error: 'Failed to fetch icon metadata' })
      }
    }
  )

  // POST /api/icons/download — cache a dashboardicons icon in DB
  app.post<{ Body: { name: string; format?: string } }>(
    '/api/icons/download',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { name, format } = req.body
      if (!name?.trim()) return reply.status(400).send({ error: 'name is required' })

      // Check if already cached (same name + source)
      const existing = db.prepare(
        "SELECT id, name, mime_type FROM icons WHERE source = 'dashboardicons' AND name = ? AND (? IS NULL OR mime_type LIKE ?)"
      ).get(name, format ?? null, format ? `image/${format}%` : '%') as Pick<IconRow, 'id' | 'name' | 'mime_type'> | undefined
      if (existing) return { id: existing.id, name: existing.name, mime_type: existing.mime_type }

      // Get metadata to determine base format
      let meta: Record<string, MetadataEntry>
      try { meta = await getMetadata() } catch { return reply.status(502).send({ error: 'Failed to fetch icon metadata' }) }

      const entry = meta[name]
      if (!entry) return reply.status(404).send({ error: `Icon "${name}" not found in dashboard-icons` })

      const fmt = format ?? entry.base
      if (!['svg', 'png', 'webp'].includes(fmt)) return reply.status(400).send({ error: 'format must be svg, png or webp' })

      const url = `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/${fmt}/${name}.${fmt}`
      let data: Buffer
      try {
        const { body, statusCode } = await undiciRequest(url, { headersTimeout: 10_000, bodyTimeout: 30_000 })
        if (statusCode !== 200) return reply.status(404).send({ error: `Icon not available in ${fmt} format` })
        const chunks: Buffer[] = []
        for await (const chunk of body) chunks.push(Buffer.from(chunk))
        data = Buffer.concat(chunks)
      } catch {
        return reply.status(502).send({ error: 'Failed to download icon from CDN' })
      }

      const mimeMap: Record<string, string> = { svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp' }
      const mimeType = mimeMap[fmt] ?? 'image/png'
      const id = nanoid()
      db.prepare('INSERT INTO icons (id, name, source, source_url, data, mime_type) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, name, 'dashboardicons', url, data, mimeType)
      return { id, name, mime_type: mimeType }
    }
  )

  // POST /api/icons/upload — upload a custom icon (admin only)
  app.post<{ Body: { data: string; content_type: string; name?: string } }>(
    '/api/icons/upload',
    { onRequest: app.requireAdmin },
    async (req, reply) => {
      const { data, content_type, name } = req.body
      if (!data || !content_type) return reply.status(400).send({ error: 'data and content_type required' })
      const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
      if (!validTypes.includes(content_type)) return reply.status(415).send({ error: 'Unsupported type. Use PNG, JPG, SVG or WEBP.' })
      const buffer = Buffer.from(data, 'base64')
      if (buffer.length > 512 * 1024) return reply.status(413).send({ error: 'Image too large (max 512 KB)' })
      const id = nanoid()
      const iconName = name?.trim() || `upload_${id}`
      db.prepare('INSERT INTO icons (id, name, source, data, mime_type) VALUES (?, ?, ?, ?, ?)').run(id, iconName, 'upload', buffer, content_type)
      return reply.status(201).send({ id, name: iconName, mime_type: content_type })
    }
  )

  // GET /api/icons/:id — serve icon data (public, icons shown to all users)
  app.get<{ Params: { id: string } }>(
    '/api/icons/:id',
    { logLevel: 'silent' },
    async (req, reply) => {
      const row = db.prepare('SELECT data, mime_type FROM icons WHERE id = ?').get(req.params.id) as Pick<IconRow, 'data' | 'mime_type'> | undefined
      if (!row) return reply.status(404).send({ error: 'Not found' })
      reply.header('Content-Type', row.mime_type)
      reply.header('Cache-Control', 'public, max-age=86400')
      return reply.send(row.data)
    }
  )

  // DELETE /api/icons/:id — admin only, only if not referenced
  app.delete<{ Params: { id: string } }>(
    '/api/icons/:id',
    { onRequest: app.requireAdmin },
    async (req, reply) => {
      const { id } = req.params
      const svcRef = db.prepare('SELECT id FROM services WHERE icon_id = ? LIMIT 1').get(id)
      const bmRef = db.prepare('SELECT id FROM bookmarks WHERE icon_id = ? LIMIT 1').get(id)
      const wRef = db.prepare('SELECT id FROM widgets WHERE icon_id = ? LIMIT 1').get(id)
      if (svcRef || bmRef || wRef) return reply.status(409).send({ error: 'Icon is in use and cannot be deleted' })
      db.prepare('DELETE FROM icons WHERE id = ?').run(id)
      return reply.status(204).send()
    }
  )
}
