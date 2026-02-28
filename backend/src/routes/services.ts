import { FastifyInstance } from 'fastify'
import { getDb } from '../db/database'
import { nanoid } from 'nanoid'
import { request } from 'undici'

export async function servicesRoutes(app: FastifyInstance) {
  const db = getDb()

  // GET /api/services
  app.get('/api/services', async () => {
    return db.prepare('SELECT * FROM services ORDER BY position_y, position_x').all()
  })

  // GET /api/services/:id
  app.get<{ Params: { id: string } }>('/api/services/:id', async (req, reply) => {
    const row = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id)
    if (!row) return reply.status(404).send({ error: 'Not found' })
    return row
  })

  // POST /api/services
  app.post<{ Body: any }>('/api/services', async (req, reply) => {
    const { name, url, icon, description, group_id, tags, check_enabled, check_url, check_interval, position_x, position_y, width, height } = req.body
    if (!name || !url) return reply.status(400).send({ error: 'name and url are required' })

    const id = nanoid()
    db.prepare(`
      INSERT INTO services (id, group_id, name, url, icon, description, tags, check_enabled, check_url, check_interval, position_x, position_y, width, height)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, group_id ?? null, name, url,
      icon ?? null, description ?? null,
      JSON.stringify(tags ?? []),
      check_enabled !== false ? 1 : 0,
      check_url ?? null,
      check_interval ?? 60,
      position_x ?? 0, position_y ?? 0,
      width ?? 1, height ?? 1
    )

    return reply.status(201).send(db.prepare('SELECT * FROM services WHERE id = ?').get(id))
  })

  // PATCH /api/services/:id
  app.patch<{ Params: { id: string }; Body: any }>('/api/services/:id', async (req, reply) => {
    const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id) as any
    if (!existing) return reply.status(404).send({ error: 'Not found' })

    const fields = ['name', 'url', 'icon', 'description', 'group_id', 'tags', 'check_enabled', 'check_url', 'check_interval', 'position_x', 'position_y', 'width', 'height']
    const updates: string[] = ['updated_at = datetime(\'now\')']
    const values: any[] = []

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`)
        if (field === 'tags') {
          values.push(JSON.stringify(req.body[field]))
        } else if (field === 'check_enabled') {
          values.push(req.body[field] ? 1 : 0)
        } else {
          values.push(req.body[field])
        }
      }
    }

    values.push(req.params.id)
    db.prepare(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    return db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id)
  })

  // DELETE /api/services/:id
  app.delete<{ Params: { id: string } }>('/api/services/:id', async (req, reply) => {
    const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id)
    if (!existing) return reply.status(404).send({ error: 'Not found' })
    db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id)
    return reply.status(204).send()
  })

  // POST /api/services/:id/check - manual health check
  app.post<{ Params: { id: string } }>('/api/services/:id/check', async (req, reply) => {
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id) as any
    if (!service) return reply.status(404).send({ error: 'Not found' })

    const checkUrl = service.check_url || service.url
    const status = await pingService(checkUrl)

    db.prepare('UPDATE services SET last_status = ?, last_checked = datetime(\'now\') WHERE id = ?')
      .run(status, req.params.id)

    return { id: service.id, status, checked_at: new Date().toISOString() }
  })

  // POST /api/services/check-all
  app.post('/api/services/check-all', async () => {
    const services = db.prepare('SELECT * FROM services WHERE check_enabled = 1').all() as any[]
    const results = await Promise.all(
      services.map(async (s) => {
        const checkUrl = s.check_url || s.url
        const status = await pingService(checkUrl)
        db.prepare('UPDATE services SET last_status = ?, last_checked = datetime(\'now\') WHERE id = ?')
          .run(status, s.id)
        return { id: s.id, status }
      })
    )
    return results
  })
}

async function pingService(url: string): Promise<string> {
  try {
    const res = await request(url, {
      method: 'GET',
      headersTimeout: 5000,
      bodyTimeout: 5000,
    })
    const status = res.statusCode < 500 ? 'online' : 'offline'
    // Consume body to release the socket back to the connection pool
    try { await res.body.text() } catch { /* ignore body read errors */ }
    return status
  } catch {
    return 'offline'
  }
}
