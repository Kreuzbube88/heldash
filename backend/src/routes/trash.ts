import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { nanoid } from 'nanoid'
import { getDb } from '../db/database'
import { fetchTrashData, getTrashCacheInfo } from '../trash/github-fetcher'
import { computeChangeset } from '../trash/sync-engine'
import type { UserCustomFormat, FormatOverride } from '../trash/sync-engine'
import { RadarrClient, ArrCustomFormat, ArrQualityProfile } from '../arr/radarr'
import { SonarrClient } from '../arr/sonarr'

// ── DB row types ──────────────────────────────────────────────────────────────

interface ArrInstanceRow {
  id: string
  type: string
  name: string
  url: string
  api_key: string
  enabled: number
  position: number
}

interface TrashInstanceConfigRow {
  instance_id: string
  profile_slug: string | null
  updated_at: string
}

interface TrashCustomFormatRow {
  id: string
  instance_id: string
  name: string
  specifications: string
  created_at: string | null
  updated_at: string | null
}

interface TrashFormatOverrideRow {
  instance_id: string
  format_slug: string
  score_override: number | null
  excluded: number
}

// ── Request body types ────────────────────────────────────────────────────────

interface SaveConfigBody {
  profile_slug: string | null
}

interface CreateCFBody {
  name: string
  specifications: object[]
}

interface PatchCFBody {
  name?: string
  specifications?: object[]
}

interface SaveOverridesBody {
  overrides: Array<{
    format_slug: string
    score_override: number | null
    excluded: boolean
  }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getArrInstance(db: ReturnType<typeof getDb>, instanceId: string): ArrInstanceRow | undefined {
  return db.prepare('SELECT * FROM arr_instances WHERE id = ?').get(instanceId) as ArrInstanceRow | undefined
}

function getArrClient(row: ArrInstanceRow): RadarrClient | SonarrClient {
  if (row.type === 'radarr') return new RadarrClient(row.url, row.api_key)
  if (row.type === 'sonarr') return new SonarrClient(row.url, row.api_key)
  throw new Error(`Unsupported type for TRaSH sync: ${row.type}`)
}

function requireRadarrSonarr(
  row: ArrInstanceRow | undefined,
  reply: FastifyReply
): row is ArrInstanceRow {
  if (!row) {
    reply.status(404).send({ error: 'Instance not found' })
    return false
  }
  if (row.type !== 'radarr' && row.type !== 'sonarr') {
    reply.status(400).send({ error: 'TRaSH sync only supports radarr and sonarr instances' })
    return false
  }
  return true
}

function getOverrides(db: ReturnType<typeof getDb>, instanceId: string): FormatOverride[] {
  const rows = db.prepare(
    'SELECT format_slug, score_override, excluded FROM trash_format_overrides WHERE instance_id = ?'
  ).all(instanceId) as TrashFormatOverrideRow[]
  return rows.map(r => ({
    format_slug: r.format_slug,
    score_override: r.score_override,
    excluded: r.excluded,
  }))
}

function getCustomFormats(db: ReturnType<typeof getDb>, instanceId: string): UserCustomFormat[] {
  const rows = db.prepare(
    'SELECT id, name, specifications FROM trash_custom_formats WHERE instance_id = ?'
  ).all(instanceId) as TrashCustomFormatRow[]
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    specifications: JSON.parse(r.specifications || '[]') as object[],
  }))
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function trashRoutes(app: FastifyInstance) {
  const db = getDb()

  // GET /api/trash/instances/:id/profiles
  app.get<{ Params: { id: string } }>(
    '/api/trash/instances/:id/profiles',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const row = getArrInstance(db, req.params.id)
      if (!requireRadarrSonarr(row, reply)) return

      try {
        const result = await fetchTrashData()
        const profiles = row.type === 'radarr'
          ? result.data.radarrProfiles
          : result.data.sonarrProfiles
        return reply.send(profiles.map(p => ({ slug: p.slug, name: p.name })))
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return reply.status(502).send({ error: `Failed to fetch TRaSH data: ${msg}` })
      }
    }
  )

  // GET /api/trash/instances/:id/config
  app.get<{ Params: { id: string } }>(
    '/api/trash/instances/:id/config',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const row = getArrInstance(db, req.params.id)
      if (!requireRadarrSonarr(row, reply)) return

      const config = db.prepare(
        'SELECT instance_id, profile_slug, updated_at FROM trash_instance_config WHERE instance_id = ?'
      ).get(req.params.id) as TrashInstanceConfigRow | undefined

      return reply.send({ profile_slug: config?.profile_slug ?? null })
    }
  )

  // PATCH /api/trash/instances/:id/config
  app.patch<{ Params: { id: string }; Body: SaveConfigBody }>(
    '/api/trash/instances/:id/config',
    { preHandler: app.requireAdmin },
    async (req, reply) => {
      const row = getArrInstance(db, req.params.id)
      if (!requireRadarrSonarr(row, reply)) return

      const { profile_slug } = req.body
      db.prepare(`
        INSERT INTO trash_instance_config (instance_id, profile_slug, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(instance_id) DO UPDATE SET
          profile_slug = excluded.profile_slug,
          updated_at = excluded.updated_at
      `).run(req.params.id, profile_slug ?? null)

      return reply.send({ ok: true, profile_slug: profile_slug ?? null })
    }
  )

  // GET /api/trash/instances/:id/custom-formats
  app.get<{ Params: { id: string } }>(
    '/api/trash/instances/:id/custom-formats',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const row = getArrInstance(db, req.params.id)
      if (!requireRadarrSonarr(row, reply)) return

      const rows = db.prepare(
        'SELECT id, instance_id, name, specifications, created_at, updated_at FROM trash_custom_formats WHERE instance_id = ? ORDER BY created_at ASC'
      ).all(req.params.id) as TrashCustomFormatRow[]

      return reply.send(rows.map(r => ({
        id: r.id,
        instance_id: r.instance_id,
        name: r.name,
        specifications: JSON.parse(r.specifications || '[]'),
        created_at: r.created_at,
        updated_at: r.updated_at,
      })))
    }
  )

  // POST /api/trash/instances/:id/custom-formats
  app.post<{ Params: { id: string }; Body: CreateCFBody }>(
    '/api/trash/instances/:id/custom-formats',
    { preHandler: app.requireAdmin },
    async (req, reply) => {
      const row = getArrInstance(db, req.params.id)
      if (!requireRadarrSonarr(row, reply)) return

      const { name, specifications } = req.body
      if (!name?.trim()) return reply.status(400).send({ error: 'Name required' })

      const id = nanoid()
      const now = new Date().toISOString()
      db.prepare(
        'INSERT INTO trash_custom_formats (id, instance_id, name, specifications, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, req.params.id, name.trim(), JSON.stringify(specifications ?? []), now, now)

      return reply.status(201).send({
        id,
        instance_id: req.params.id,
        name: name.trim(),
        specifications: specifications ?? [],
        created_at: now,
        updated_at: now,
      })
    }
  )

  // PATCH /api/trash/instances/:id/custom-formats/:cfId
  app.patch<{ Params: { id: string; cfId: string }; Body: PatchCFBody }>(
    '/api/trash/instances/:id/custom-formats/:cfId',
    { preHandler: app.requireAdmin },
    async (req, reply) => {
      const row = getArrInstance(db, req.params.id)
      if (!requireRadarrSonarr(row, reply)) return

      const cf = db.prepare(
        'SELECT id, name, specifications FROM trash_custom_formats WHERE id = ? AND instance_id = ?'
      ).get(req.params.cfId, req.params.id) as TrashCustomFormatRow | undefined

      if (!cf) return reply.status(404).send({ error: 'Custom format not found' })

      const name = req.body.name?.trim() ?? cf.name
      const specifications = req.body.specifications ?? JSON.parse(cf.specifications || '[]')
      const now = new Date().toISOString()

      db.prepare(
        'UPDATE trash_custom_formats SET name = ?, specifications = ?, updated_at = ? WHERE id = ?'
      ).run(name, JSON.stringify(specifications), now, req.params.cfId)

      return reply.send({
        id: cf.id,
        instance_id: req.params.id,
        name,
        specifications,
        updated_at: now,
      })
    }
  )

  // DELETE /api/trash/instances/:id/custom-formats/:cfId
  app.delete<{ Params: { id: string; cfId: string } }>(
    '/api/trash/instances/:id/custom-formats/:cfId',
    { preHandler: app.requireAdmin },
    async (req, reply) => {
      const row = getArrInstance(db, req.params.id)
      if (!requireRadarrSonarr(row, reply)) return

      db.prepare(
        'DELETE FROM trash_custom_formats WHERE id = ? AND instance_id = ?'
      ).run(req.params.cfId, req.params.id)

      return reply.status(204).send()
    }
  )

  // GET /api/trash/instances/:id/format-list
  app.get<{ Params: { id: string } }>(
    '/api/trash/instances/:id/format-list',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const row = getArrInstance(db, req.params.id)
      if (!requireRadarrSonarr(row, reply)) return

      let trashData
      try {
        const result = await fetchTrashData()
        trashData = result.data
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return reply.status(502).send({ error: `Failed to fetch TRaSH data: ${msg}` })
      }

      const trashFormats = row.type === 'radarr'
        ? trashData.radarrCFs
        : trashData.sonarrCFs

      const config = db.prepare(
        'SELECT profile_slug FROM trash_instance_config WHERE instance_id = ?'
      ).get(req.params.id) as { profile_slug: string | null } | undefined

      const profiles = row.type === 'radarr' ? trashData.radarrProfiles : trashData.sonarrProfiles
      const selectedProfile = config?.profile_slug
        ? profiles.find(p => p.slug === config.profile_slug)
        : null

      const overrides = getOverrides(db, req.params.id)
      const overrideMap = new Map(overrides.map(o => [o.format_slug, o]))

      const userCFs = db.prepare(
        'SELECT id, name, specifications FROM trash_custom_formats WHERE instance_id = ?'
      ).all(req.params.id) as TrashCustomFormatRow[]

      const result = [
        ...trashFormats.map(cf => {
          const override = overrideMap.get(cf.slug)
          const profileScore = selectedProfile?.formatItems.find(fi => fi.name === cf.name)?.score ?? 0
          return {
            slug: cf.slug,
            name: cf.name,
            source: 'trash' as const,
            defaultScore: profileScore,
            scoreOverride: override?.score_override ?? null,
            excluded: (override?.excluded ?? 0) === 1,
            specifications: cf.specifications,
          }
        }),
        ...userCFs.map(cf => ({
          slug: cf.id,
          name: cf.name,
          source: 'custom' as const,
          defaultScore: 0,
          scoreOverride: null,
          excluded: false,
          specifications: JSON.parse(cf.specifications || '[]') as object[],
        })),
      ]

      return reply.send(result)
    }
  )

  // PUT /api/trash/instances/:id/overrides (bulk replace)
  app.put<{ Params: { id: string }; Body: SaveOverridesBody }>(
    '/api/trash/instances/:id/overrides',
    { preHandler: app.requireAdmin },
    async (req, reply) => {
      const row = getArrInstance(db, req.params.id)
      if (!requireRadarrSonarr(row, reply)) return

      const { overrides } = req.body

      db.prepare('DELETE FROM trash_format_overrides WHERE instance_id = ?').run(req.params.id)

      const insert = db.prepare(
        'INSERT INTO trash_format_overrides (instance_id, format_slug, score_override, excluded) VALUES (?, ?, ?, ?)'
      )
      const insertAll = db.transaction(() => {
        for (const o of overrides) {
          insert.run(req.params.id, o.format_slug, o.score_override, o.excluded ? 1 : 0)
        }
      })
      insertAll()

      return reply.send({ ok: true })
    }
  )

  // GET /api/trash/instances/:id/preview
  app.get<{ Params: { id: string } }>(
    '/api/trash/instances/:id/preview',
    { preHandler: app.authenticate },
    async (req, reply) => {
      const row = getArrInstance(db, req.params.id)
      if (!requireRadarrSonarr(row, reply)) return

      const config = db.prepare(
        'SELECT profile_slug FROM trash_instance_config WHERE instance_id = ?'
      ).get(req.params.id) as { profile_slug: string | null } | undefined

      if (!config?.profile_slug) {
        return reply.status(400).send({ error: 'No profile configured for this instance' })
      }

      let trashResult
      try {
        trashResult = await fetchTrashData()
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return reply.status(502).send({ error: `Failed to fetch TRaSH data: ${msg}` })
      }

      const { data: trashData, previousSlugs } = trashResult
      const trashFormats = row.type === 'radarr' ? trashData.radarrCFs : trashData.sonarrCFs
      const profiles = row.type === 'radarr' ? trashData.radarrProfiles : trashData.sonarrProfiles
      const trashProfile = profiles.find(p => p.slug === config.profile_slug) ?? null

      const client = getArrClient(row)
      let arrFormats: ArrCustomFormat[]
      let arrProfile: ArrQualityProfile | null = null

      try {
        arrFormats = await client.getCustomFormats()
        const allProfiles = await client.getQualityProfiles()
        // Try to find the quality profile by name matching the TRaSH profile
        if (trashProfile) {
          arrProfile = allProfiles.find(p => p.name.toLowerCase() === trashProfile.name.toLowerCase()) ?? null
          // Fallback: first profile
          if (!arrProfile && allProfiles.length > 0) arrProfile = allProfiles[0]
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return reply.status(502).send({ error: `Cannot reach ${row.name}: ${msg}` })
      }

      const overrides = getOverrides(db, req.params.id)
      const customFormats = getCustomFormats(db, req.params.id)

      const changeset = computeChangeset({
        trashFormats,
        trashProfile,
        userCustomFormats: customFormats,
        overrides,
        arrFormats,
        arrProfile,
        previousSlugs: row.type === 'radarr' ? previousSlugs.radarrCFs : previousSlugs.sonarrCFs,
      })

      return reply.send(changeset)
    }
  )

  // POST /api/trash/instances/:id/apply
  app.post<{ Params: { id: string } }>(
    '/api/trash/instances/:id/apply',
    { preHandler: app.requireAdmin },
    async (req, reply) => {
      const row = getArrInstance(db, req.params.id)
      if (!requireRadarrSonarr(row, reply)) return

      const config = db.prepare(
        'SELECT profile_slug FROM trash_instance_config WHERE instance_id = ?'
      ).get(req.params.id) as { profile_slug: string | null } | undefined

      if (!config?.profile_slug) {
        return reply.status(400).send({ error: 'No profile configured for this instance' })
      }

      let trashResult
      try {
        trashResult = await fetchTrashData()
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return reply.status(502).send({ error: `Failed to fetch TRaSH data: ${msg}` })
      }

      const { data: trashData, previousSlugs } = trashResult
      const trashFormats = row.type === 'radarr' ? trashData.radarrCFs : trashData.sonarrCFs
      const profiles = row.type === 'radarr' ? trashData.radarrProfiles : trashData.sonarrProfiles
      const trashProfile = profiles.find(p => p.slug === config.profile_slug) ?? null

      const client = getArrClient(row)
      let arrFormats: ArrCustomFormat[]
      let arrProfiles: ArrQualityProfile[]

      try {
        arrFormats = await client.getCustomFormats()
        arrProfiles = await client.getQualityProfiles()
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return reply.status(502).send({ error: `Cannot reach ${row.name}: ${msg}` })
      }

      let arrProfile: ArrQualityProfile | null = null
      if (trashProfile) {
        arrProfile = arrProfiles.find(p => p.name.toLowerCase() === trashProfile.name.toLowerCase()) ?? null
        if (!arrProfile && arrProfiles.length > 0) arrProfile = arrProfiles[0]
      }

      const overrides = getOverrides(db, req.params.id)
      const customFormats = getCustomFormats(db, req.params.id)

      const changeset = computeChangeset({
        trashFormats,
        trashProfile,
        userCustomFormats: customFormats,
        overrides,
        arrFormats,
        arrProfile,
        previousSlugs: row.type === 'radarr' ? previousSlugs.radarrCFs : previousSlugs.sonarrCFs,
      })

      let created = 0
      let updated = 0
      let scoresUpdated = 0
      let skipped = 0
      const errors: string[] = []

      // Phase A: Create new TRaSH CFs
      const nameToArrId = new Map<string, number>()
      for (const af of arrFormats) {
        nameToArrId.set(af.name, af.id)
      }

      for (const item of changeset.toCreate) {
        const cf = trashFormats.find(f => f.slug === item.slug)
        if (!cf) { skipped++; continue }
        try {
          const created_cf = await client.createCustomFormat({ name: cf.name, specifications: cf.specifications })
          nameToArrId.set(created_cf.name, created_cf.id)
          created++
        } catch (e: unknown) {
          errors.push(`Create ${item.name}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      // Phase B: Update existing TRaSH CFs
      for (const item of changeset.toUpdate) {
        const cf = trashFormats.find(f => f.slug === item.slug)
        if (!cf) { skipped++; continue }
        const arrId = nameToArrId.get(cf.name)
        if (!arrId) { skipped++; continue }
        try {
          await client.updateCustomFormat(arrId, { name: cf.name, specifications: cf.specifications })
          updated++
        } catch (e: unknown) {
          errors.push(`Update ${item.name}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      // Phase C: Create custom formats
      for (const item of changeset.customToCreate) {
        const cf = customFormats.find(f => f.id === item.slug)
        if (!cf) { skipped++; continue }
        try {
          const created_cf = await client.createCustomFormat({ name: cf.name, specifications: cf.specifications })
          nameToArrId.set(created_cf.name, created_cf.id)
          created++
        } catch (e: unknown) {
          errors.push(`Create custom ${item.name}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      // Phase D: Update custom formats
      for (const item of changeset.customToUpdate) {
        const cf = customFormats.find(f => f.id === item.slug)
        if (!cf) { skipped++; continue }
        const arrId = nameToArrId.get(cf.name)
        if (!arrId) { skipped++; continue }
        try {
          await client.updateCustomFormat(arrId, { name: cf.name, specifications: cf.specifications })
          updated++
        } catch (e: unknown) {
          errors.push(`Update custom ${item.name}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      // Phase E: Update quality profile scores
      if (changeset.toUpdateScores.length > 0 && arrProfile) {
        // Re-fetch formats to get fresh IDs (some may have been created above)
        let freshFormats: ArrCustomFormat[] = []
        try {
          freshFormats = await client.getCustomFormats()
        } catch {
          // fall back to old list
          freshFormats = arrFormats
        }
        const freshNameToId = new Map<string, number>()
        for (const af of freshFormats) {
          freshNameToId.set(af.name, af.id)
        }

        // Build updated profile
        const updatedProfile: ArrQualityProfile = {
          ...arrProfile,
          formatItems: arrProfile.formatItems.map(fi => {
            const scoreChange = changeset.toUpdateScores.find(sc => {
              const arrId = freshNameToId.get(sc.name)
              return arrId === fi.format
            })
            if (scoreChange) return { ...fi, score: scoreChange.newScore }
            return fi
          }),
        }

        // Add format items for newly created formats
        for (const sc of changeset.toUpdateScores) {
          const arrId = freshNameToId.get(sc.name)
          if (!arrId) continue
          const alreadyInProfile = updatedProfile.formatItems.some(fi => fi.format === arrId)
          if (!alreadyInProfile) {
            updatedProfile.formatItems.push({ format: arrId, score: sc.newScore, name: sc.name })
          }
        }

        try {
          await client.updateQualityProfile(arrProfile.id, updatedProfile)
          scoresUpdated = changeset.toUpdateScores.length
        } catch (e: unknown) {
          errors.push(`Update quality profile: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      return reply.send({ created, updated, scoresUpdated, skipped, errors })
    }
  )

  // POST /api/trash/github/refresh
  app.post(
    '/api/trash/github/refresh',
    { preHandler: app.requireAdmin },
    async (_req, reply) => {
      try {
        const result = await fetchTrashData(true)
        return reply.send({
          ok: true,
          fromCache: result.fromCache,
          fetchedAt: result.fetchedAt,
          counts: {
            radarrCFs: result.data.radarrCFs.length,
            sonarrCFs: result.data.sonarrCFs.length,
            radarrProfiles: result.data.radarrProfiles.length,
            sonarrProfiles: result.data.sonarrProfiles.length,
          },
        })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return reply.status(502).send({ error: `GitHub fetch failed: ${msg}` })
      }
    }
  )

  // GET /api/trash/cache/info
  app.get(
    '/api/trash/cache/info',
    { preHandler: app.authenticate },
    async (_req, reply) => {
      const info = getTrashCacheInfo()
      return reply.send(info)
    }
  )
}
