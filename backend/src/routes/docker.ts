import { FastifyInstance, FastifyRequest } from 'fastify'
import { request } from 'undici'
import { getDb } from '../db/database'

// ── Docker Engine API helper ──────────────────────────────────────────────────
async function dockerReq(path: string, method = 'GET', body?: object) {
  return request(`http://localhost${path}`, {
    socketPath: '/var/run/docker.sock',
    method,
    ...(body
      ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
      : {}),
  })
}

// ── Access control ────────────────────────────────────────────────────────────
interface UserGroupRow { docker_access: number }

async function hasDockerAccess(req: FastifyRequest): Promise<boolean> {
  try {
    await req.jwtVerify()
    if (req.user.role === 'admin') return true
    const groupId = req.user.groupId
    if (!groupId) return false
    const db = getDb()
    const row = db.prepare('SELECT docker_access FROM user_groups WHERE id = ?').get(groupId) as UserGroupRow | undefined
    return row?.docker_access === 1
  } catch {
    return false
  }
}

// ── Docker container/stats types ──────────────────────────────────────────────
interface DockerContainerJson {
  Id: string
  Names: string[]
  Image: string
  State: string
  Status: string
  Created: number
}

interface DockerStatsJson {
  cpu_stats: {
    cpu_usage: { total_usage: number; percpu_usage?: number[] }
    system_cpu_usage: number
    online_cpus?: number
  }
  precpu_stats: {
    cpu_usage: { total_usage: number }
    system_cpu_usage: number
  }
  memory_stats: {
    usage: number
    limit: number
  }
}

// ── Parse Docker multiplexed log stream ───────────────────────────────────────
// Each frame: [stream_type(1)][reserved(3)][size(4 big-endian)] + payload
// stream_type: 1=stdout, 2=stderr. If TTY=true, raw text with no header.
function parseMuxedFrame(buf: Buffer): { consumed: number; stream: 'stdout' | 'stderr'; payload: Buffer } | null {
  if (buf.length < 8) return null
  const streamByte = buf[0]
  const size = buf.readUInt32BE(4)
  if (buf.length < 8 + size) return null
  const payload = buf.subarray(8, 8 + size)
  const stream = streamByte === 2 ? 'stderr' : 'stdout'
  return { consumed: 8 + size, stream, payload }
}

// ── Routes ────────────────────────────────────────────────────────────────────
export async function dockerRoutes(app: FastifyInstance) {

  // GET /api/docker/containers — list all containers
  app.get('/api/docker/containers', async (req, reply) => {
    if (!(await hasDockerAccess(req))) return reply.status(403).send({ error: 'Forbidden' })

    let res
    try {
      res = await dockerReq('/v1.41/containers/json?all=true')
    } catch {
      return reply.status(503).send({ error: 'Docker unavailable' })
    }

    if (!res.statusCode || res.statusCode >= 400) {
      await res.body.text().catch(() => {})
      return reply.status(502).send({ error: 'Docker API error' })
    }

    const raw = await res.body.json() as DockerContainerJson[]
    return raw.map(c => ({
      id: c.Id,
      name: (c.Names[0] ?? c.Id).replace(/^\//, ''),
      image: c.Image,
      state: c.State,
      status: c.Status,
      startedAt: c.Created ? new Date(c.Created * 1000).toISOString() : null,
    }))
  })

  // GET /api/docker/containers/:id/stats — one-shot CPU + RAM stats
  app.get('/api/docker/containers/:id/stats', async (req, reply) => {
    if (!(await hasDockerAccess(req))) return reply.status(403).send({ error: 'Forbidden' })
    const { id } = req.params as { id: string }

    let res
    try {
      res = await dockerReq(`/v1.41/containers/${id}/stats?stream=false`)
    } catch {
      return reply.status(503).send({ error: 'Docker unavailable' })
    }

    if (!res.statusCode || res.statusCode >= 400) {
      await res.body.text().catch(() => {})
      return reply.status(res.statusCode ?? 502).send({ error: 'Docker API error' })
    }

    const s = await res.body.json() as DockerStatsJson

    const cpuDelta = s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage
    const sysDelta = s.cpu_stats.system_cpu_usage - s.precpu_stats.system_cpu_usage
    const numCPU = s.cpu_stats.online_cpus ?? s.cpu_stats.cpu_usage.percpu_usage?.length ?? 1
    const cpuPercent = sysDelta > 0 ? Math.round(((cpuDelta / sysDelta) * numCPU * 100) * 10) / 10 : 0

    return {
      cpuPercent,
      memUsed: s.memory_stats.usage ?? 0,
      memTotal: s.memory_stats.limit ?? 0,
    }
  })

  // GET /api/docker/containers/:id/logs — SSE log stream
  app.get('/api/docker/containers/:id/logs', async (req, reply) => {
    if (!(await hasDockerAccess(req))) return reply.status(403).send({ error: 'Forbidden' })
    const { id } = req.params as { id: string }
    const qs = req.query as Record<string, string>
    const tail = qs.tail ? parseInt(qs.tail, 10) : 200

    let dockerRes
    try {
      dockerRes = await dockerReq(
        `/v1.41/containers/${id}/logs?follow=1&stdout=1&stderr=1&timestamps=1&tail=${tail}`
      )
    } catch {
      return reply.status(503).send({ error: 'Docker unavailable' })
    }

    if (!dockerRes.statusCode || dockerRes.statusCode >= 400) {
      await dockerRes.body.text().catch(() => {})
      return reply.status(dockerRes.statusCode ?? 502).send({ error: 'Container not found or Docker API error' })
    }

    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no')
    reply.raw.flushHeaders()

    // Cleanup on client disconnect
    req.raw.on('close', () => {
      dockerRes.body.destroy()
    })

    let buf = Buffer.alloc(0)
    let isMuxed: boolean | null = null  // null = undecided, true = muxed, false = raw TTY

    try {
      for await (const chunk of dockerRes.body) {
        if (reply.raw.destroyed) break
        buf = Buffer.concat([buf, chunk as Buffer])

        // Detect format on first data: muxed frames start with 0x01 or 0x02
        if (isMuxed === null && buf.length >= 1) {
          isMuxed = buf[0] === 1 || buf[0] === 2
        }

        if (isMuxed) {
          // Parse multiplexed frames
          while (true) {
            const frame = parseMuxedFrame(buf)
            if (!frame) break
            buf = buf.subarray(frame.consumed)
            const lines = frame.payload.toString('utf8').split('\n')
            for (const raw of lines) {
              const line = raw.replace(/\r$/, '')
              if (!line) continue
              // Docker includes RFC3339 timestamp at start when timestamps=1
              const tsMatch = line.match(/^(\S+)\s(.*)$/)
              const timestamp = tsMatch ? tsMatch[1] : ''
              const log = tsMatch ? tsMatch[2] : line
              const evt = JSON.stringify({ stream: frame.stream, log, timestamp })
              reply.raw.write(`data: ${evt}\n\n`)
            }
          }
        } else {
          // Raw TTY mode — emit line by line
          const text = buf.toString('utf8')
          const lines = text.split('\n')
          // Keep incomplete last line in buffer
          buf = Buffer.from(lines.pop() ?? '')
          for (const raw of lines) {
            const line = raw.replace(/\r$/, '')
            if (!line) continue
            const tsMatch = line.match(/^(\S+)\s(.*)$/)
            const timestamp = tsMatch ? tsMatch[1] : ''
            const log = tsMatch ? tsMatch[2] : line
            const evt = JSON.stringify({ stream: 'stdout', log, timestamp })
            reply.raw.write(`data: ${evt}\n\n`)
          }
        }
      }
    } catch {
      // Client disconnected or stream ended
    }

    if (!reply.raw.destroyed) {
      reply.raw.write('data: {"stream":"stdout","log":"[stream ended]","timestamp":""}\n\n')
      reply.raw.end()
    }
  })

  // POST /api/docker/containers/:id/start — admin only
  app.post('/api/docker/containers/:id/start', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    let res
    try { res = await dockerReq(`/v1.41/containers/${id}/start`, 'POST') }
    catch { return reply.status(503).send({ error: 'Docker unavailable' }) }
    await res.body.text().catch(() => {})
    if (res.statusCode === 204 || res.statusCode === 304) return { ok: true }
    return reply.status(res.statusCode ?? 502).send({ error: 'Docker API error' })
  })

  // POST /api/docker/containers/:id/stop — admin only
  app.post('/api/docker/containers/:id/stop', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    let res
    try { res = await dockerReq(`/v1.41/containers/${id}/stop`, 'POST') }
    catch { return reply.status(503).send({ error: 'Docker unavailable' }) }
    await res.body.text().catch(() => {})
    if (res.statusCode === 204 || res.statusCode === 304) return { ok: true }
    return reply.status(res.statusCode ?? 502).send({ error: 'Docker API error' })
  })

  // POST /api/docker/containers/:id/restart — admin only
  app.post('/api/docker/containers/:id/restart', { preHandler: [app.requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string }
    let res
    try { res = await dockerReq(`/v1.41/containers/${id}/restart`, 'POST') }
    catch { return reply.status(503).send({ error: 'Docker unavailable' }) }
    await res.body.text().catch(() => {})
    if (res.statusCode === 204) return { ok: true }
    return reply.status(res.statusCode ?? 502).send({ error: 'Docker API error' })
  })
}
