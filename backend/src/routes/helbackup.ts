import { FastifyInstance } from 'fastify'
import { request, Agent } from 'undici'
import { getDb } from '../db/database'

const agent = new Agent({
  headersTimeout: 10_000,
  bodyTimeout: 15_000,
  connect: { rejectUnauthorized: false },
})

interface HelbackupRow {
  id: string
  type: string
  name: string
  url: string
  config: string
  enabled: number
}

async function getHelbackupInstance(): Promise<{ url: string; token: string } | null> {
  const db = getDb()
  const row = db.prepare(
    "SELECT * FROM instances WHERE type = 'helbackup' AND enabled = 1 LIMIT 1"
  ).get() as HelbackupRow | undefined
  if (!row) return null
  const config = JSON.parse(row.config) as { token?: string }
  if (!config.token) return null
  return { url: row.url.replace(/\/$/, ''), token: config.token }
}

async function helbackupGet<T>(baseUrl: string, token: string, path: string): Promise<T> {
  const res = await request(`${baseUrl}${path}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    dispatcher: agent,
  })
  const chunks: Buffer[] = []
  for await (const chunk of res.body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const body = chunks.length ? Buffer.concat(chunks).toString('utf-8') : 'null'
  if (res.statusCode >= 400) {
    let msg = `HTTP ${res.statusCode}`
    try {
      const j = JSON.parse(body) as { error?: string | { message?: string }; message?: string }
      const detail = j.message ?? (typeof j.error === 'string' ? j.error : j.error?.message) ?? body.slice(0, 200)
      msg += ': ' + detail
    } catch { if (body !== 'null') msg += ': ' + body.slice(0, 200) }
    throw new Error(msg)
  }
  return JSON.parse(body) as T
}

async function helbackupPost<T>(baseUrl: string, token: string, path: string): Promise<T> {
  const res = await request(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    dispatcher: agent,
  })
  const chunks: Buffer[] = []
  for await (const chunk of res.body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const body = chunks.length ? Buffer.concat(chunks).toString('utf-8') : 'null'
  if (res.statusCode >= 400) {
    let msg = `HTTP ${res.statusCode}`
    try {
      const j = JSON.parse(body) as { error?: string | { message?: string }; message?: string }
      const detail = j.message ?? (typeof j.error === 'string' ? j.error : j.error?.message) ?? body.slice(0, 200)
      msg += ': ' + detail
    } catch { if (body !== 'null') msg += ': ' + body.slice(0, 200) }
    throw new Error(msg)
  }
  return JSON.parse(body) as T
}

export async function helbackupRoutes(app: FastifyInstance) {
  app.get('/api/helbackup/status', { preHandler: [app.authenticate] }, async (_req, reply) => {
    const inst = await getHelbackupInstance()
    if (!inst) return reply.status(404).send({ error: 'HELBACKUP instance not configured' })
    try {
      const json = await helbackupGet<{ success: boolean; data: unknown }>(inst.url, inst.token, '/api/v1/widget/status')
      return json.data
    } catch (err) {
      return reply.status(503).send({ error: err instanceof Error ? err.message : 'Could not connect to HELBACKUP' })
    }
  })

  app.get('/api/helbackup/jobs', { preHandler: [app.authenticate] }, async (_req, reply) => {
    const inst = await getHelbackupInstance()
    if (!inst) return reply.status(404).send({ error: 'HELBACKUP instance not configured' })
    try {
      const json = await helbackupGet<{ success: boolean; data: unknown }>(inst.url, inst.token, '/api/v1/jobs')
      return json.data
    } catch (err) {
      return reply.status(503).send({ error: err instanceof Error ? err.message : 'Could not connect to HELBACKUP' })
    }
  })

  app.get('/api/helbackup/backups', { preHandler: [app.authenticate] }, async (_req, reply) => {
    const inst = await getHelbackupInstance()
    if (!inst) return reply.status(404).send({ error: 'HELBACKUP instance not configured' })
    try {
      const json = await helbackupGet<{ success: boolean; data: unknown }>(inst.url, inst.token, '/api/v1/backups?limit=10&offset=0')
      return json.data
    } catch (err) {
      return reply.status(503).send({ error: err instanceof Error ? err.message : 'Could not connect to HELBACKUP' })
    }
  })

  app.post<{ Params: { jobId: string } }>('/api/helbackup/jobs/:jobId/trigger', { preHandler: [app.authenticate] }, async (req, reply) => {
    const inst = await getHelbackupInstance()
    if (!inst) return reply.status(404).send({ error: 'HELBACKUP instance not configured' })
    try {
      const json = await helbackupPost<{ success: boolean; data: unknown }>(inst.url, inst.token, `/api/v1/jobs/${req.params.jobId}/trigger`)
      return json.data
    } catch (err) {
      return reply.status(503).send({ error: err instanceof Error ? err.message : 'Could not connect to HELBACKUP' })
    }
  })
}
