import { FastifyInstance, FastifyReply } from 'fastify'
import { nanoid } from 'nanoid'
import { request, Agent } from 'undici'
import { getDb } from '../db/database'
import { logActivity } from './activity'

interface UnraidInstanceRow {
  id: string; name: string; url: string; api_key: string
  enabled: number; position: number; created_at: string; updated_at: string
}
interface CreateBody  { name: string; url: string; api_key: string }
interface PatchBody   { name?: string; url?: string; api_key?: string; enabled?: boolean; position?: number }
interface ReorderBody { ids: string[] }
interface TestBody    { url: string; api_key: string }
interface ParityStartBody { correct: boolean }

function sanitizeInstance(row: UnraidInstanceRow) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    enabled: row.enabled === 1,
    position: row.position,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

const gqlAgent = new Agent({
  connect: { rejectUnauthorized: false },
  headersTimeout: 8_000,
  bodyTimeout: 8_000,
})

async function unraidGql(url: string, apiKey: string, query: string, variables?: object): Promise<unknown> {
  const res = await request(`${url.replace(/\/$/, '')}/graphql`, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    dispatcher: gqlAgent,
  })
  const json = await res.body.json() as { data?: unknown; errors?: { message: string }[] }
  if (json.errors?.length) throw new Error(json.errors[0].message)
  return json.data
}

async function getInstance(id: string, reply: FastifyReply): Promise<UnraidInstanceRow | null> {
  const db = getDb()
  const row = db.prepare('SELECT * FROM unraid_instances WHERE id = ?').get(id) as UnraidInstanceRow | undefined
  if (!row) { reply.status(404).send({ error: 'Not found' }); return null }
  if (!row.enabled) { reply.status(423).send({ error: 'Instanz deaktiviert' }); return null }
  return row
}

export async function unraidRoutes(app: FastifyInstance) {
  const db = () => getDb()

  // GET /api/unraid/instances
  app.get('/api/unraid/instances', { onRequest: [app.authenticate] }, async () => {
    const rows = db().prepare('SELECT * FROM unraid_instances ORDER BY position ASC').all() as UnraidInstanceRow[]
    return rows.map(sanitizeInstance)
  })

  // POST /api/unraid/test  — BEFORE /:id routes
  app.post<{ Body: TestBody }>('/api/unraid/test', { onRequest: [app.requireAdmin] }, async (req, reply) => {
    const { url, api_key } = req.body
    if (!url || !api_key) return reply.status(400).send({ error: 'url and api_key required' })
    try {
      await unraidGql(url, api_key, 'query { online }')
      return { ok: true }
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/instances  — BEFORE /instances/reorder and /instances/:id
  app.post<{ Body: CreateBody }>('/api/unraid/instances', { onRequest: [app.requireAdmin] }, async (req, reply) => {
    const { name, url, api_key } = req.body
    if (!name || !url || !api_key) return reply.status(400).send({ error: 'name, url, api_key required' })
    const id = nanoid()
    const maxPos = db().prepare('SELECT MAX(position) as m FROM unraid_instances').get() as { m: number | null }
    const position = (maxPos.m ?? -1) + 1
    db().prepare(`INSERT INTO unraid_instances (id, name, url, api_key, position) VALUES (?, ?, ?, ?, ?)`).run(id, name, url, api_key, position)
    const row = db().prepare('SELECT * FROM unraid_instances WHERE id = ?').get(id) as UnraidInstanceRow
    return reply.status(201).send(sanitizeInstance(row))
  })

  // POST /api/unraid/instances/reorder  — BEFORE /instances/:id
  app.post<{ Body: ReorderBody }>('/api/unraid/instances/reorder', { onRequest: [app.requireAdmin] }, async (req, reply) => {
    const { ids } = req.body
    if (!Array.isArray(ids)) return reply.status(400).send({ error: 'ids required' })
    const stmt = db().prepare("UPDATE unraid_instances SET position = ?, updated_at = datetime('now') WHERE id = ?")
    ids.forEach((id, idx) => stmt.run(idx, id))
    return { ok: true }
  })

  // PATCH /api/unraid/instances/:id
  app.patch<{ Params: { id: string }; Body: PatchBody }>('/api/unraid/instances/:id', { onRequest: [app.requireAdmin] }, async (req, reply) => {
    const row = db().prepare('SELECT * FROM unraid_instances WHERE id = ?').get(req.params.id) as UnraidInstanceRow | undefined
    if (!row) return reply.status(404).send({ error: 'Not found' })
    const { name, url, api_key, enabled, position } = req.body
    const updates: string[] = ["updated_at = datetime('now')"]
    const vals: unknown[] = []
    if (name !== undefined) { updates.push('name = ?'); vals.push(name) }
    if (url !== undefined) { updates.push('url = ?'); vals.push(url) }
    if (api_key !== undefined) { updates.push('api_key = ?'); vals.push(api_key) }
    if (enabled !== undefined) { updates.push('enabled = ?'); vals.push(enabled ? 1 : 0) }
    if (position !== undefined) { updates.push('position = ?'); vals.push(position) }
    db().prepare(`UPDATE unraid_instances SET ${updates.join(', ')} WHERE id = ?`).run(...vals, req.params.id)
    const updated = db().prepare('SELECT * FROM unraid_instances WHERE id = ?').get(req.params.id) as UnraidInstanceRow
    return sanitizeInstance(updated)
  })

  // DELETE /api/unraid/instances/:id
  app.delete<{ Params: { id: string } }>('/api/unraid/instances/:id', { onRequest: [app.requireAdmin] }, async (req, reply) => {
    const row = db().prepare('SELECT * FROM unraid_instances WHERE id = ?').get(req.params.id) as UnraidInstanceRow | undefined
    if (!row) return reply.status(404).send({ error: 'Not found' })
    db().prepare('DELETE FROM unraid_instances WHERE id = ?').run(req.params.id)
    return reply.status(204).send()
  })

  // GET /api/unraid/:id/ping
  app.get<{ Params: { id: string } }>('/api/unraid/:id/ping', { logLevel: 'silent', onRequest: [app.authenticate] }, async (req) => {
    const db2 = getDb()
    const row = db2.prepare('SELECT * FROM unraid_instances WHERE id = ?').get(req.params.id) as UnraidInstanceRow | undefined
    if (!row || !row.enabled) return { online: false }
    try {
      await unraidGql(row.url, row.api_key, 'query { online }')
      return { online: true }
    } catch {
      return { online: false }
    }
  })

  // GET /api/unraid/:id/info
  app.get<{ Params: { id: string } }>('/api/unraid/:id/info', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      return await unraidGql(row.url, row.api_key, `query {
        info {
          os { platform distro release uptime hostname }
          cpu { manufacturer brand cores threads }
          memory { total free used }
          baseboard { manufacturer model }
        }
        online
      }`)
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // GET /api/unraid/:id/array
  app.get<{ Params: { id: string } }>('/api/unraid/:id/array', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      return await unraidGql(row.url, row.api_key, `query {
        array {
          state
          capacity { kilobytes { free used total } }
          disks { id name device size status temp rotational fsSize fsFree fsUsed fsUsedPercent }
        }
      }`)
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // GET /api/unraid/:id/parity
  app.get<{ Params: { id: string } }>('/api/unraid/:id/parity', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      return await unraidGql(row.url, row.api_key, `query {
        array { parityHistory { date duration speed status errors } }
      }`)
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/array/start
  app.post<{ Params: { id: string } }>('/api/unraid/:id/array/start', { onRequest: [app.requireAdmin] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      const result = await unraidGql(row.url, row.api_key, `mutation { startArray { state } }`)
      logActivity('unraid', `Array gestartet — ${row.name}`, 'info', { instanceId: req.params.id })
      return result
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/array/stop
  app.post<{ Params: { id: string } }>('/api/unraid/:id/array/stop', { onRequest: [app.requireAdmin] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      const result = await unraidGql(row.url, row.api_key, `mutation { stopArray { state } }`)
      logActivity('unraid', `Array gestoppt — ${row.name}`, 'info', { instanceId: req.params.id })
      return result
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/parity/start
  app.post<{ Params: { id: string }; Body: ParityStartBody }>('/api/unraid/:id/parity/start', { onRequest: [app.requireAdmin] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    const correct = req.body.correct ?? false
    try {
      const result = await unraidGql(row.url, row.api_key, `mutation($correct: Boolean!) { startParityCheck(correct: $correct) { status } }`, { correct })
      logActivity('unraid', `Parity Check gestartet — ${row.name}`, 'info', { instanceId: req.params.id, correct })
      return result
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/parity/pause
  app.post<{ Params: { id: string } }>('/api/unraid/:id/parity/pause', { onRequest: [app.requireAdmin] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      return await unraidGql(row.url, row.api_key, `mutation { pauseParityCheck { status } }`)
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/parity/resume
  app.post<{ Params: { id: string } }>('/api/unraid/:id/parity/resume', { onRequest: [app.requireAdmin] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      return await unraidGql(row.url, row.api_key, `mutation { resumeParityCheck { status } }`)
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/parity/cancel
  app.post<{ Params: { id: string } }>('/api/unraid/:id/parity/cancel', { onRequest: [app.requireAdmin] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      return await unraidGql(row.url, row.api_key, `mutation { cancelParityCheck { status } }`)
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/disks/:diskId/spinup
  app.post<{ Params: { id: string; diskId: string } }>('/api/unraid/:id/disks/:diskId/spinup', { onRequest: [app.requireAdmin] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    const diskId = decodeURIComponent(req.params.diskId)
    try {
      return await unraidGql(row.url, row.api_key, `mutation($id: String!) { spinUpDisk(id: $id) { id status } }`, { id: diskId })
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/disks/:diskId/spindown
  app.post<{ Params: { id: string; diskId: string } }>('/api/unraid/:id/disks/:diskId/spindown', { onRequest: [app.requireAdmin] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    const diskId = decodeURIComponent(req.params.diskId)
    try {
      return await unraidGql(row.url, row.api_key, `mutation($id: String!) { spinDownDisk(id: $id) { id status } }`, { id: diskId })
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // GET /api/unraid/:id/docker
  app.get<{ Params: { id: string } }>('/api/unraid/:id/docker', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      const data = await unraidGql(row.url, row.api_key, `query {
        dockerContainers { id names state status image autoStart hostConfig { networkMode } }
      }`) as { dockerContainers?: unknown[] }
      return data?.dockerContainers ?? []
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/docker/:containerName/start
  app.post<{ Params: { id: string; containerName: string } }>('/api/unraid/:id/docker/:containerName/start', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    const containerName = decodeURIComponent(req.params.containerName)
    const mutationId = 'container:' + containerName.replace(/^\//, '')
    try {
      const result = await unraidGql(row.url, row.api_key, `mutation($id: String!) { startContainer(id: $id) { id state } }`, { id: mutationId })
      logActivity('unraid', `Docker ${containerName} start — ${row.name}`, 'info', { instanceId: req.params.id })
      return result
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/docker/:containerName/stop
  app.post<{ Params: { id: string; containerName: string } }>('/api/unraid/:id/docker/:containerName/stop', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    const containerName = decodeURIComponent(req.params.containerName)
    const mutationId = 'container:' + containerName.replace(/^\//, '')
    try {
      const result = await unraidGql(row.url, row.api_key, `mutation($id: String!) { stopContainer(id: $id) { id state } }`, { id: mutationId })
      logActivity('unraid', `Docker ${containerName} stop — ${row.name}`, 'info', { instanceId: req.params.id })
      return result
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/docker/:containerName/restart
  app.post<{ Params: { id: string; containerName: string } }>('/api/unraid/:id/docker/:containerName/restart', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    const containerName = decodeURIComponent(req.params.containerName)
    const mutationId = 'container:' + containerName.replace(/^\//, '')
    try {
      const result = await unraidGql(row.url, row.api_key, `mutation($id: String!) { restartContainer(id: $id) { id state } }`, { id: mutationId })
      logActivity('unraid', `Docker ${containerName} restart — ${row.name}`, 'info', { instanceId: req.params.id })
      return result
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // GET /api/unraid/:id/vms
  app.get<{ Params: { id: string } }>('/api/unraid/:id/vms', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      return await unraidGql(row.url, row.api_key, `query {
        vms { domains { uuid name state coreCount memoryMin primaryGPU os autoStart } }
      }`)
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/vms/:uuid/start
  app.post<{ Params: { id: string; uuid: string } }>('/api/unraid/:id/vms/:uuid/start', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    const uuid = decodeURIComponent(req.params.uuid)
    try {
      const result = await unraidGql(row.url, row.api_key, `mutation($id: String!) { startVm(id: $id) { uuid state } }`, { id: uuid })
      logActivity('unraid', `VM ${uuid} start — ${row.name}`, 'info', { instanceId: req.params.id })
      return result
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/vms/:uuid/stop
  app.post<{ Params: { id: string; uuid: string } }>('/api/unraid/:id/vms/:uuid/stop', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    const uuid = decodeURIComponent(req.params.uuid)
    try {
      const result = await unraidGql(row.url, row.api_key, `mutation($id: String!) { stopVm(id: $id) { uuid state } }`, { id: uuid })
      logActivity('unraid', `VM ${uuid} stop — ${row.name}`, 'info', { instanceId: req.params.id })
      return result
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/vms/:uuid/pause
  app.post<{ Params: { id: string; uuid: string } }>('/api/unraid/:id/vms/:uuid/pause', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    const uuid = decodeURIComponent(req.params.uuid)
    try {
      const result = await unraidGql(row.url, row.api_key, `mutation($id: String!) { pauseVm(id: $id) { uuid state } }`, { id: uuid })
      logActivity('unraid', `VM ${uuid} pause — ${row.name}`, 'info', { instanceId: req.params.id })
      return result
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/vms/:uuid/resume
  app.post<{ Params: { id: string; uuid: string } }>('/api/unraid/:id/vms/:uuid/resume', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    const uuid = decodeURIComponent(req.params.uuid)
    try {
      const result = await unraidGql(row.url, row.api_key, `mutation($id: String!) { resumeVm(id: $id) { uuid state } }`, { id: uuid })
      logActivity('unraid', `VM ${uuid} resume — ${row.name}`, 'info', { instanceId: req.params.id })
      return result
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // GET /api/unraid/:id/shares
  app.get<{ Params: { id: string } }>('/api/unraid/:id/shares', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      return await unraidGql(row.url, row.api_key, `query {
        shares { name comment security free used size cacheEnabled }
      }`)
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // GET /api/unraid/:id/users
  app.get<{ Params: { id: string } }>('/api/unraid/:id/users', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      return await unraidGql(row.url, row.api_key, `query {
        users { name description role }
      }`)
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // GET /api/unraid/:id/notifications
  app.get<{ Params: { id: string } }>('/api/unraid/:id/notifications', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      return await unraidGql(row.url, row.api_key, `query {
        notifications {
          overview { unread total }
          list(filter: { limit: 30 }) { id title subject description importance timestamp }
        }
      }`)
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // POST /api/unraid/:id/notifications/:notifId/dismiss
  app.post<{ Params: { id: string; notifId: string } }>('/api/unraid/:id/notifications/:notifId/dismiss', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    const notifId = decodeURIComponent(req.params.notifId)
    try {
      return await unraidGql(row.url, row.api_key, `mutation($id: String!) { dismissNotification(id: $id) { id } }`, { id: notifId })
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })

  // GET /api/unraid/:id/config
  app.get<{ Params: { id: string } }>('/api/unraid/:id/config', { onRequest: [app.authenticate] }, async (req, reply) => {
    const row = await getInstance(req.params.id, reply)
    if (!row) return
    try {
      return await unraidGql(row.url, row.api_key, `query {
        config { valid error registrationTo registrationType }
      }`)
    } catch (e) {
      return reply.status(502).send({ error: (e as Error).message })
    }
  })
}
