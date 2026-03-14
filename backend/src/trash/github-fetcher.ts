import { getDb } from '../db/database'

export function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export interface TrashCF {
  slug: string
  name: string
  trash_id?: string
  type: 'radarr' | 'sonarr'
  specifications: object[]
}

export interface TrashProfile {
  slug: string
  name: string
  type: 'radarr' | 'sonarr'
  formatItems: { name: string; score: number }[]
}

export interface TrashData {
  radarrCFs: TrashCF[]
  sonarrCFs: TrashCF[]
  radarrProfiles: TrashProfile[]
  sonarrProfiles: TrashProfile[]
}

export interface FetchResult {
  data: TrashData
  fromCache: boolean
  fetchedAt: string
  previousSlugs: {
    radarrCFs: string[]
    sonarrCFs: string[]
  }
}

interface TreeFile {
  path: string
  sha: string
  type: string
}

interface CacheRow {
  id: string
  data: string
  tree_sha: string | null
  fetched_at: string
}

type FileSHAMap = Record<string, string>

interface CachePayload {
  data: TrashData
  fileSHAs: FileSHAMap
}

const TREE_URL = 'https://api.github.com/repos/TRaSH-Guides/Guides/git/trees/master?recursive=1'
const RAW_BASE = 'https://raw.githubusercontent.com/TRaSH-Guides/Guides/master'

const DIRS = {
  radarrCF: 'docs/json/radarr/cf/',
  sonarrCF: 'docs/json/sonarr/cf/',
  radarrProfiles: 'docs/json/radarr/quality-profiles/',
  sonarrProfiles: 'docs/json/sonarr/quality-profiles/',
} as const

async function ghFetch(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'heldash/1.0',
    },
  })
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${url}`)
  }
  return res.json()
}

async function fetchRaw(path: string): Promise<unknown> {
  const res = await fetch(`${RAW_BASE}/${path}`, {
    headers: { 'User-Agent': 'heldash/1.0' },
  })
  if (!res.ok) {
    throw new Error(`Raw fetch ${res.status}: ${path}`)
  }
  return res.json()
}

function parseCF(json: unknown, type: 'radarr' | 'sonarr', slug: string): TrashCF | null {
  if (!json || typeof json !== 'object') return null
  const obj = json as Record<string, unknown>
  const name = obj['name'] as string | undefined
  if (!name) return null
  return {
    slug,
    name,
    trash_id: obj['trash_id'] as string | undefined,
    type,
    specifications: Array.isArray(obj['specifications']) ? (obj['specifications'] as object[]) : [],
  }
}

function parseProfile(json: unknown, type: 'radarr' | 'sonarr', slug: string): TrashProfile | null {
  if (!json || typeof json !== 'object') return null
  const obj = json as Record<string, unknown>
  const name = obj['name'] as string | undefined
  if (!name) return null
  const formatItems: { name: string; score: number }[] = []
  if (Array.isArray(obj['formatItems'])) {
    for (const item of obj['formatItems'] as unknown[]) {
      const fi = item as Record<string, unknown>
      if (typeof fi['name'] === 'string' && typeof fi['score'] === 'number') {
        formatItems.push({ name: fi['name'] as string, score: fi['score'] as number })
      }
    }
  }
  return { slug: slug || toSlug(name), name, type, formatItems }
}

export async function fetchTrashData(force = false): Promise<FetchResult> {
  const db = getDb()

  const cacheRow = db.prepare(
    'SELECT id, data, tree_sha, fetched_at FROM trash_cache WHERE id = ?'
  ).get('main') as CacheRow | undefined

  const now = new Date()
  const cacheAgeSeconds = cacheRow
    ? (now.getTime() - new Date(cacheRow.fetched_at).getTime()) / 1000
    : Infinity

  // Return from cache if fresh enough (< 24h) and not forced
  if (!force && cacheRow && cacheAgeSeconds < 86400) {
    const cached = JSON.parse(cacheRow.data) as CachePayload
    return {
      data: cached.data,
      fromCache: true,
      fetchedAt: cacheRow.fetched_at,
      previousSlugs: {
        radarrCFs: cached.data.radarrCFs.map(c => c.slug),
        sonarrCFs: cached.data.sonarrCFs.map(c => c.slug),
      },
    }
  }

  // Fetch tree from GitHub
  const treeResp = await ghFetch(TREE_URL) as { sha: string; tree: TreeFile[] }
  const newTreeSHA = treeResp.sha

  // Load old data
  let oldFileSHAs: FileSHAMap = {}
  let oldData: TrashData = { radarrCFs: [], sonarrCFs: [], radarrProfiles: [], sonarrProfiles: [] }
  if (cacheRow) {
    const cached = JSON.parse(cacheRow.data) as CachePayload
    oldFileSHAs = cached.fileSHAs ?? {}
    oldData = cached.data
  }

  const previousSlugs = {
    radarrCFs: oldData.radarrCFs.map(c => c.slug),
    sonarrCFs: oldData.sonarrCFs.map(c => c.slug),
  }

  // If tree SHA unchanged, just bump fetched_at
  if (cacheRow?.tree_sha === newTreeSHA) {
    db.prepare('UPDATE trash_cache SET fetched_at = ? WHERE id = ?').run(now.toISOString(), 'main')
    return {
      data: oldData,
      fromCache: true,
      fetchedAt: now.toISOString(),
      previousSlugs,
    }
  }

  // Filter relevant JSON files
  const relevantFiles = treeResp.tree.filter(f =>
    f.type === 'blob' &&
    f.path.endsWith('.json') &&
    (f.path.startsWith(DIRS.radarrCF) ||
      f.path.startsWith(DIRS.sonarrCF) ||
      f.path.startsWith(DIRS.radarrProfiles) ||
      f.path.startsWith(DIRS.sonarrProfiles))
  )

  const changedFiles = relevantFiles.filter(f => oldFileSHAs[f.path] !== f.sha)

  // Build new file SHA map
  const newFileSHAs: FileSHAMap = {}
  for (const f of relevantFiles) {
    newFileSHAs[f.path] = f.sha
  }

  // Start with copy of old data
  const newData: TrashData = {
    radarrCFs: [...oldData.radarrCFs],
    sonarrCFs: [...oldData.sonarrCFs],
    radarrProfiles: [...oldData.radarrProfiles],
    sonarrProfiles: [...oldData.sonarrProfiles],
  }

  // Remove data for paths no longer in tree
  const activePaths = new Set(relevantFiles.map(f => f.path))
  for (const f of Object.keys(oldFileSHAs)) {
    if (!activePaths.has(f)) {
      const slug = f.split('/').pop()?.replace('.json', '') ?? ''
      if (f.startsWith(DIRS.radarrCF)) {
        newData.radarrCFs = newData.radarrCFs.filter(c => c.slug !== slug)
      } else if (f.startsWith(DIRS.sonarrCF)) {
        newData.sonarrCFs = newData.sonarrCFs.filter(c => c.slug !== slug)
      } else if (f.startsWith(DIRS.radarrProfiles)) {
        newData.radarrProfiles = newData.radarrProfiles.filter(p => p.slug !== slug)
      } else if (f.startsWith(DIRS.sonarrProfiles)) {
        newData.sonarrProfiles = newData.sonarrProfiles.filter(p => p.slug !== slug)
      }
    }
  }

  // Fetch and update changed files
  for (const file of changedFiles) {
    const slug = file.path.split('/').pop()?.replace('.json', '') ?? ''
    let parsed: unknown
    try {
      parsed = await fetchRaw(file.path)
    } catch {
      continue
    }

    if (file.path.startsWith(DIRS.radarrCF)) {
      const cf = parseCF(parsed, 'radarr', slug)
      if (cf) {
        newData.radarrCFs = newData.radarrCFs.filter(c => c.slug !== slug)
        newData.radarrCFs.push(cf)
      }
    } else if (file.path.startsWith(DIRS.sonarrCF)) {
      const cf = parseCF(parsed, 'sonarr', slug)
      if (cf) {
        newData.sonarrCFs = newData.sonarrCFs.filter(c => c.slug !== slug)
        newData.sonarrCFs.push(cf)
      }
    } else if (file.path.startsWith(DIRS.radarrProfiles)) {
      const profile = parseProfile(parsed, 'radarr', slug)
      if (profile) {
        newData.radarrProfiles = newData.radarrProfiles.filter(p => p.slug !== slug)
        newData.radarrProfiles.push(profile)
      }
    } else if (file.path.startsWith(DIRS.sonarrProfiles)) {
      const profile = parseProfile(parsed, 'sonarr', slug)
      if (profile) {
        newData.sonarrProfiles = newData.sonarrProfiles.filter(p => p.slug !== slug)
        newData.sonarrProfiles.push(profile)
      }
    }
  }

  // Persist to cache
  const cachePayload = JSON.stringify({ data: newData, fileSHAs: newFileSHAs })
  db.prepare(`
    INSERT INTO trash_cache (id, data, tree_sha, fetched_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      data = excluded.data,
      tree_sha = excluded.tree_sha,
      fetched_at = excluded.fetched_at
  `).run('main', cachePayload, newTreeSHA, now.toISOString())

  return {
    data: newData,
    fromCache: false,
    fetchedAt: now.toISOString(),
    previousSlugs,
  }
}

export function getTrashCacheInfo(): { fetchedAt: string | null; treeSha: string | null } {
  const db = getDb()
  const row = db.prepare('SELECT fetched_at, tree_sha FROM trash_cache WHERE id = ?').get('main') as
    | { fetched_at: string; tree_sha: string | null }
    | undefined
  return { fetchedAt: row?.fetched_at ?? null, treeSha: row?.tree_sha ?? null }
}
