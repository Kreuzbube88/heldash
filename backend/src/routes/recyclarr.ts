import { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'
import { getDb } from '../db/database.js'
import { stringify } from 'yaml'
import * as fs from 'fs'
import * as path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const RECYCLARR_CONFIG_PATH = process.env.RECYCLARR_CONFIG_PATH ?? '/recyclarr/recyclarr.yml'
const RECYCLARR_CONTAINER_NAME = process.env.RECYCLARR_CONTAINER_NAME ?? 'recyclarr'

// ─── Hardcoded template list ───────────────────────────────────────────────

interface RecyclarrTemplate {
  slug: string
  name: string
  type: 'profile' | 'custom_formats' | 'quality_definition'
  mediaType: 'radarr' | 'sonarr'
  pairedWith?: string
}

const TEMPLATES: RecyclarrTemplate[] = [
  // Radarr quality definitions
  { slug: 'radarr-quality-definition-movie', name: 'Movie Quality Sizes', type: 'quality_definition', mediaType: 'radarr' },
  // Radarr profiles
  { slug: 'radarr-quality-profile-hd-bluray-web', name: 'HD Bluray + WEB', type: 'profile', mediaType: 'radarr', pairedWith: 'radarr-custom-formats-hd-bluray-web' },
  { slug: 'radarr-quality-profile-uhd-bluray-web', name: 'UHD Bluray + WEB', type: 'profile', mediaType: 'radarr', pairedWith: 'radarr-custom-formats-uhd-bluray-web' },
  { slug: 'radarr-quality-profile-remux-web-1080p', name: 'Remux + WEB 1080p', type: 'profile', mediaType: 'radarr', pairedWith: 'radarr-custom-formats-remux-web-1080p' },
  { slug: 'radarr-quality-profile-remux-web-2160p', name: 'Remux + WEB 2160p', type: 'profile', mediaType: 'radarr', pairedWith: 'radarr-custom-formats-remux-web-2160p' },
  // Radarr custom formats
  { slug: 'radarr-custom-formats-hd-bluray-web', name: 'HD Bluray + WEB (CFs)', type: 'custom_formats', mediaType: 'radarr', pairedWith: 'radarr-quality-profile-hd-bluray-web' },
  { slug: 'radarr-custom-formats-uhd-bluray-web', name: 'UHD Bluray + WEB (CFs)', type: 'custom_formats', mediaType: 'radarr', pairedWith: 'radarr-quality-profile-uhd-bluray-web' },
  { slug: 'radarr-custom-formats-remux-web-1080p', name: 'Remux + WEB 1080p (CFs)', type: 'custom_formats', mediaType: 'radarr', pairedWith: 'radarr-quality-profile-remux-web-1080p' },
  { slug: 'radarr-custom-formats-remux-web-2160p', name: 'Remux + WEB 2160p (CFs)', type: 'custom_formats', mediaType: 'radarr', pairedWith: 'radarr-quality-profile-remux-web-2160p' },
  // Sonarr quality definitions
  { slug: 'sonarr-quality-definition-series', name: 'Series Quality Sizes', type: 'quality_definition', mediaType: 'sonarr' },
  // Sonarr profiles
  { slug: 'sonarr-quality-profile-web-1080p', name: 'WEB 1080p', type: 'profile', mediaType: 'sonarr', pairedWith: 'sonarr-custom-formats-web-1080p' },
  { slug: 'sonarr-quality-profile-web-2160p', name: 'WEB 2160p', type: 'profile', mediaType: 'sonarr', pairedWith: 'sonarr-custom-formats-web-2160p' },
  { slug: 'sonarr-quality-profile-anime-sonarr', name: 'Anime', type: 'profile', mediaType: 'sonarr', pairedWith: 'sonarr-custom-formats-anime' },
  // Sonarr custom formats
  { slug: 'sonarr-custom-formats-web-1080p', name: 'WEB 1080p (CFs)', type: 'custom_formats', mediaType: 'sonarr', pairedWith: 'sonarr-quality-profile-web-1080p' },
  { slug: 'sonarr-custom-formats-web-2160p', name: 'WEB 2160p (CFs)', type: 'custom_formats', mediaType: 'sonarr', pairedWith: 'sonarr-quality-profile-web-2160p' },
  { slug: 'sonarr-custom-formats-anime', name: 'Anime (CFs)', type: 'custom_formats', mediaType: 'sonarr', pairedWith: 'sonarr-quality-profile-anime-sonarr' },
]

// ─── DB row types ──────────────────────────────────────────────────────────

interface RecyclarrConfigRow {
  id: string
  instance_id: string
  enabled: number
  templates: string
  score_overrides: string
  user_cf_names: string
  updated_at: string
}

interface ArrInstanceRow {
  id: string
  name: string
  type: string
}

interface ScoreOverride {
  trash_id: string
  name: string
  score: number
  profileName: string
}

interface UserCf {
  name: string
  score: number
  profileName: string
}

interface SaveConfigBody {
  enabled: boolean
  templates: string[]
  scoreOverrides: ScoreOverride[]
  userCfNames: UserCf[]
}

interface SyncBody {
  instanceId?: string
}

// ─── TRaSH CF cache ────────────────────────────────────────────────────────

interface CfEntry {
  trash_id: string
  name: string
  defaultScore: number
  profileName: string
}

const cfCache: Map<string, { entries: CfEntry[]; fetchedAt: number }> = new Map()
const CF_CACHE_TTL = 24 * 60 * 60 * 1000 // 24h

function getCacheDir(): string {
  return path.dirname(RECYCLARR_CONFIG_PATH)
}

function getCacheFilePath(): string {
  return path.join(getCacheDir(), 'trash_cache.json')
}

function loadCacheFromDisk(): Record<string, { entries: CfEntry[]; fetchedAt: number }> {
  try {
    const raw = fs.readFileSync(getCacheFilePath(), 'utf8')
    return JSON.parse(raw) as Record<string, { entries: CfEntry[]; fetchedAt: number }>
  } catch {
    return {}
  }
}

function saveCacheToDisk(): void {
  try {
    const obj: Record<string, { entries: CfEntry[]; fetchedAt: number }> = {}
    for (const [k, v] of cfCache.entries()) {
      obj[k] = v
    }
    const dir = getCacheDir()
    if (!fs.existsSync(dir)) return
    fs.writeFileSync(getCacheFilePath(), JSON.stringify(obj), 'utf8')
  } catch {
    // ignore write errors (dir may not exist)
  }
}

// Load disk cache into memory on module load
{
  const disk = loadCacheFromDisk()
  for (const [k, v] of Object.entries(disk)) {
    cfCache.set(k, v)
  }
}

// TRaSH Guides GitHub paths for CF JSON files per template
const TEMPLATE_CF_PATHS: Record<string, { mediaType: string; profileName: string }> = {
  'radarr-custom-formats-hd-bluray-web': { mediaType: 'radarr', profileName: 'HD Bluray + WEB' },
  'radarr-custom-formats-uhd-bluray-web': { mediaType: 'radarr', profileName: 'UHD Bluray + WEB' },
  'radarr-custom-formats-remux-web-1080p': { mediaType: 'radarr', profileName: 'Remux + WEB 1080p' },
  'radarr-custom-formats-remux-web-2160p': { mediaType: 'radarr', profileName: 'Remux + WEB 2160p' },
  'sonarr-custom-formats-web-1080p': { mediaType: 'sonarr', profileName: 'WEB 1080p' },
  'sonarr-custom-formats-web-2160p': { mediaType: 'sonarr', profileName: 'WEB 2160p' },
  'sonarr-custom-formats-anime': { mediaType: 'sonarr', profileName: 'Anime' },
}

async function fetchCfListForTemplate(templateSlug: string, forceRefresh = false): Promise<CfEntry[]> {
  const cached = cfCache.get(templateSlug)
  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CF_CACHE_TTL) {
    return cached.entries
  }

  const meta = TEMPLATE_CF_PATHS[templateSlug]
  if (!meta) return []

  try {
    const { fetch } = await import('undici')
    const treeResp = await fetch('https://api.github.com/repos/TRaSH-Guides/Guides/git/trees/master?recursive=1', {
      headers: { 'User-Agent': 'heldash/1.0', Accept: 'application/vnd.github.v3+json' },
    })
    if (!treeResp.ok) return []

    interface GitHubTreeItem { path: string; type: string; url: string }
    interface GitHubTree { tree: GitHubTreeItem[] }
    const tree = await treeResp.json() as GitHubTree

    // Find CF JSON files for this media type
    const cfDir = meta.mediaType === 'radarr' ? 'docs/json/radarr/cf' : 'docs/json/sonarr/cf'
    const cfFiles = tree.tree.filter(
      (item: GitHubTreeItem) => item.type === 'blob' && item.path.startsWith(cfDir) && item.path.endsWith('.json')
    )

    // Fetch each CF file and extract name + trash_id
    const entries: CfEntry[] = []
    const batchSize = 10
    for (let i = 0; i < cfFiles.length; i += batchSize) {
      const batch = cfFiles.slice(i, i + batchSize)
      await Promise.all(batch.map(async (item: GitHubTreeItem) => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/TRaSH-Guides/Guides/master/${item.path}`
          const resp = await fetch(rawUrl, { headers: { 'User-Agent': 'heldash/1.0' } })
          if (!resp.ok) return
          interface CfJson { name?: string; trash_id?: string; trash_scores?: Record<string, number> }
          const cf = await resp.json() as CfJson
          if (cf.name && cf.trash_id) {
            const defaultScore = cf.trash_scores?.[meta.profileName] ?? 0
            entries.push({ trash_id: cf.trash_id, name: cf.name, defaultScore, profileName: meta.profileName })
          }
        } catch { /* skip */ }
      }))
    }

    cfCache.set(templateSlug, { entries, fetchedAt: Date.now() })
    saveCacheToDisk()
    return entries
  } catch {
    return cached?.entries ?? []
  }
}

// ─── YAML generation ───────────────────────────────────────────────────────

interface RecyclarrConfig {
  instanceId: string
  enabled: boolean
  templates: string[]
  scoreOverrides: ScoreOverride[]
  userCfNames: UserCf[]
}

function generateRecyclarrYaml(configs: RecyclarrConfig[], instances: ArrInstanceRow[]): string {
  const radarr: Record<string, unknown> = {}
  const sonarr: Record<string, unknown> = {}

  for (const cfg of configs) {
    if (!cfg.enabled) continue
    const inst = instances.find(i => i.id === cfg.instanceId)
    if (!inst) continue
    if (inst.type !== 'radarr' && inst.type !== 'sonarr') continue

    const include = cfg.templates.map(slug => ({ template: slug }))

    const customFormats: unknown[] = []

    // Score overrides grouped by profileName + score
    const groupedOverrides: Record<string, { trash_ids: string[]; profileName: string; score: number }> = {}
    for (const o of cfg.scoreOverrides) {
      const key = `${o.profileName}__${o.score}`
      if (!groupedOverrides[key]) {
        groupedOverrides[key] = { trash_ids: [], profileName: o.profileName, score: o.score }
      }
      groupedOverrides[key].trash_ids.push(o.trash_id)
    }
    for (const g of Object.values(groupedOverrides)) {
      customFormats.push({
        trash_ids: g.trash_ids,
        assign_scores: [{ name: g.profileName, score: g.score }],
      })
    }

    // User custom formats
    for (const ucf of cfg.userCfNames) {
      customFormats.push({
        trash_ids: [ucf.name],
        assign_scores: [{ name: ucf.profileName, score: ucf.score }],
      })
    }

    const instanceConfig: Record<string, unknown> = { include }
    if (customFormats.length > 0) instanceConfig.custom_formats = customFormats

    const key = inst.id
    if (inst.type === 'radarr') radarr[key] = instanceConfig
    else sonarr[key] = instanceConfig
  }

  const doc: Record<string, unknown> = {}
  if (Object.keys(radarr).length > 0) doc.radarr = radarr
  if (Object.keys(sonarr).length > 0) doc.sonarr = sonarr

  return stringify(doc)
}

async function writeYaml(configs: RecyclarrConfig[], instances: ArrInstanceRow[]): Promise<void> {
  const yaml = generateRecyclarrYaml(configs, instances)
  const dir = path.dirname(RECYCLARR_CONFIG_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(RECYCLARR_CONFIG_PATH, yaml, 'utf8')
}

// ─── Route plugin ──────────────────────────────────────────────────────────

export default async function recyclarrRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/recyclarr/templates — public (all GETs are public)
  app.get('/api/recyclarr/templates', async (_req, reply) => {
    return reply.send(TEMPLATES)
  })

  // GET /api/recyclarr/config — authenticate
  app.get('/api/recyclarr/config', { onRequest: [app.authenticate] }, async (_req, reply) => {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM recyclarr_config').all() as RecyclarrConfigRow[]
    const instances = db.prepare('SELECT id, name, type FROM arr_instances').all() as ArrInstanceRow[]

    const result = rows.map(row => {
      const inst = instances.find(i => i.id === row.instance_id)
      return {
        instanceId: row.instance_id,
        instanceName: inst?.name ?? row.instance_id,
        instanceType: inst?.type ?? 'radarr',
        enabled: row.enabled === 1,
        templates: JSON.parse(row.templates) as string[],
        scoreOverrides: JSON.parse(row.score_overrides) as ScoreOverride[],
        userCfNames: JSON.parse(row.user_cf_names) as UserCf[],
      }
    })

    return reply.send(result)
  })

  // PUT /api/recyclarr/config/:instanceId — requireAdmin
  app.put<{ Params: { instanceId: string }; Body: SaveConfigBody }>(
    '/api/recyclarr/config/:instanceId',
    { onRequest: [app.requireAdmin] },
    async (req, reply) => {
      const db = getDb()
      const { instanceId } = req.params
      const { enabled, templates, scoreOverrides, userCfNames } = req.body

      const existing = db.prepare('SELECT id FROM recyclarr_config WHERE instance_id = ?').get(instanceId) as { id: string } | undefined
      if (existing) {
        db.prepare(`
          UPDATE recyclarr_config
          SET enabled = ?, templates = ?, score_overrides = ?, user_cf_names = ?, updated_at = datetime('now')
          WHERE instance_id = ?
        `).run(enabled ? 1 : 0, JSON.stringify(templates), JSON.stringify(scoreOverrides), JSON.stringify(userCfNames), instanceId)
      } else {
        db.prepare(`
          INSERT INTO recyclarr_config (id, instance_id, enabled, templates, score_overrides, user_cf_names)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(nanoid(), instanceId, enabled ? 1 : 0, JSON.stringify(templates), JSON.stringify(scoreOverrides), JSON.stringify(userCfNames))
      }

      // Regenerate YAML
      const allRows = db.prepare('SELECT * FROM recyclarr_config').all() as RecyclarrConfigRow[]
      const allInstances = db.prepare('SELECT id, name, type FROM arr_instances').all() as ArrInstanceRow[]
      const configs: RecyclarrConfig[] = allRows.map(r => ({
        instanceId: r.instance_id,
        enabled: r.enabled === 1,
        templates: JSON.parse(r.templates) as string[],
        scoreOverrides: JSON.parse(r.score_overrides) as ScoreOverride[],
        userCfNames: JSON.parse(r.user_cf_names) as UserCf[],
      }))
      try {
        await writeYaml(configs, allInstances)
      } catch (e) {
        app.log.warn({ err: e }, 'recyclarr: could not write YAML')
      }

      return reply.send({ ok: true })
    }
  )

  // GET /api/recyclarr/formats/:instanceId — authenticate
  app.get<{ Params: { instanceId: string } }>(
    '/api/recyclarr/formats/:instanceId',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const db = getDb()
      const { instanceId } = req.params
      const row = db.prepare('SELECT templates FROM recyclarr_config WHERE instance_id = ?').get(instanceId) as { templates: string } | undefined
      if (!row) return reply.send([])

      const templates = JSON.parse(row.templates) as string[]
      const cfTemplates = templates.filter(t => TEMPLATE_CF_PATHS[t])

      const allEntries: CfEntry[] = []
      await Promise.all(cfTemplates.map(async t => {
        const entries = await fetchCfListForTemplate(t)
        allEntries.push(...entries)
      }))

      return reply.send(allEntries)
    }
  )

  // POST /api/recyclarr/sync — requireAdmin
  app.post<{ Body: SyncBody }>(
    '/api/recyclarr/sync',
    { onRequest: [app.requireAdmin] },
    async (req, reply) => {
      const { instanceId } = req.body
      const args = ['exec', RECYCLARR_CONTAINER_NAME, 'recyclarr', 'sync']
      if (instanceId) args.push('--instance', instanceId)

      try {
        const { stdout, stderr } = await execFileAsync('docker', args, { timeout: 120_000 })
        return reply.send({ success: true, output: stdout + stderr })
      } catch (e: unknown) {
        const err = e as { message?: string; stdout?: string; stderr?: string }
        const output = (err.stdout ?? '') + (err.stderr ?? '')
        const message = err.message ?? String(e)
        if (message.includes('No such container')) {
          return reply.send({
            success: false,
            output,
            error: `Container '${RECYCLARR_CONTAINER_NAME}' not found — is it running?`,
          })
        }
        return reply.send({ success: false, output, error: message })
      }
    }
  )

  // POST /api/recyclarr/refresh-cache — requireAdmin
  app.post(
    '/api/recyclarr/refresh-cache',
    { onRequest: [app.requireAdmin] },
    async (_req, reply) => {
      cfCache.clear()
      saveCacheToDisk()
      return reply.send({ ok: true })
    }
  )
}
