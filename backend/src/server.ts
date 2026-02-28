import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import staticFiles from '@fastify/static'
import path from 'path'
import { initDb } from './db/database'
import { servicesRoutes } from './routes/services'
import { groupsRoutes } from './routes/groups'
import { settingsRoutes } from './routes/settings'

const PORT = parseInt(process.env.PORT ?? '8282', 10)
const DATA_DIR = process.env.DATA_DIR ?? '/data'
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'
const NODE_ENV = process.env.NODE_ENV ?? 'development'

async function start() {
  // Init DB
  initDb(DATA_DIR)

  const app = Fastify({
    logger: {
      level: LOG_LEVEL,
      transport: NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  })

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // Managed by nginx-proxy-manager in production
  })

  // CORS
  await app.register(cors, {
    origin: NODE_ENV === 'development' ? true : false,
  })

  // Override JSON parser to accept empty bodies (prevents FST_ERR_CTP_EMPTY_JSON_BODY)
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    if (!body || body === '') {
      done(null, {})
      return
    }
    try {
      done(null, JSON.parse(body as string))
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  // Serve frontend static files
  const publicPath = path.join(__dirname, '..', 'public')
  await app.register(staticFiles, {
    root: publicPath,
    prefix: '/',
  })

  // Health check endpoint
  app.get('/api/health', async () => ({
    status: 'ok',
    version: process.env.npm_package_version ?? '0.1.0',
    uptime: process.uptime(),
  }))

  // API routes
  await app.register(servicesRoutes)
  await app.register(groupsRoutes)
  await app.register(settingsRoutes)

  // SPA fallback – serve index.html for all non-API routes
  app.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith('/api')) {
      return reply.status(404).send({ error: 'Not found' })
    }
    return reply.sendFile('index.html')
  })

  await app.listen({ port: PORT, host: '0.0.0.0' })
  app.log.info(`HELDASH running on http://0.0.0.0:${PORT}`)
}

start().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
