// ── Pure merge engine ─────────────────────────────────────────────────────────
// No external API calls. No DB writes. Takes pre-loaded data, returns Changeset.

import { resolveArrId, getLastConditionsHash } from './format-id-resolver'
import type {
  NormalizedCustomFormat, NormalizedQualityProfile, ArrSnapshot,
  TrashUserOverride, UserCustomFormatForSync, Changeset,
  ChangeAdd, ChangeUpdateConditions, ChangeUpdateScore,
  ChangeProfileUpdate, ChangeDeprecate, ChangeRepair,
} from './types'

// ── Override helpers ──────────────────────────────────────────────────────────

function resolveScore(
  slug: string,
  defaultScore: number,
  overrides: Map<string, TrashUserOverride>,
): number {
  const o = overrides.get(slug)
  if (o && o.score !== null) return o.score
  return defaultScore
}

function isEnabled(slug: string, overrides: Map<string, TrashUserOverride>): boolean {
  const o = overrides.get(slug)
  return o ? o.enabled === 1 : true
}

function isExcluded(slug: string, overrides: Map<string, TrashUserOverride>): boolean {
  const o = overrides.get(slug)
  return o ? o.excluded === 1 : false
}

// ── Profile score diff helper ─────────────────────────────────────────────────

function buildProfileChanges(
  profile: NormalizedQualityProfile,
  instanceId: string,
  snapshot: ArrSnapshot,
  overrides: Map<string, TrashUserOverride>,
  excludedSlugs: Set<string>,
): ChangeProfileUpdate | null {
  const liveProfiles = snapshot.profiles.filter(p => p.name === profile.name)
  if (liveProfiles.length === 0) return null
  const liveProfile = liveProfiles[0]

  const liveScoreById = new Map<number, number>()
  for (const item of liveProfile.formatItems) {
    liveScoreById.set(item.format, item.score)
  }

  const changes: ChangeProfileUpdate['changes'] = []

  for (const fs of profile.formatScores) {
    if (excludedSlugs.has(fs.formatSlug)) continue        // excluded — skip entirely
    if (!isEnabled(fs.formatSlug, overrides)) continue    // disabled — skip score patch

    const arrId = resolveArrId(instanceId, fs.formatSlug)
    if (arrId === null) continue

    const finalScore = resolveScore(fs.formatSlug, fs.score, overrides)
    const liveScore = liveScoreById.get(arrId)

    if (liveScore === undefined || liveScore !== finalScore) {
      changes.push({ arrFormatId: arrId, slug: fs.formatSlug, score: finalScore })
    }
  }

  if (changes.length === 0) return null
  return { profileId: liveProfile.id, profileName: liveProfile.name, changes }
}

// ── Main compute function ─────────────────────────────────────────────────────
//
// upstream:               Only the TRaSH formats in this specific profile (pre-filtered by caller).
//                         Formats with source='user' have their conditions protected from updates.
// allActiveUpstreamSlugs: Union of ALL format slugs across all enabled profiles + all user custom
//                         format slugs for this instance. Used for deprecation safety.
// userCustomFormats:      User-imported formats for this profile. Only added if missing from arr;
//                         conditions are never overwritten by TRaSH updates.

export function computeChangeset(
  instanceId: string,
  profileSlug: string,
  upstream: NormalizedCustomFormat[],
  allActiveUpstreamSlugs: Set<string>,
  selectedProfile: NormalizedQualityProfile | null,
  snapshot: ArrSnapshot,
  overrides: TrashUserOverride[],
  deprecatedSlugs: Set<string>,
  userCustomFormats: UserCustomFormatForSync[],
): Changeset {
  const now = new Date().toISOString()
  const githubSha = upstream.find(f => f.source === 'trash')?.githubSha ?? ''

  const overrideMap = new Map<string, TrashUserOverride>(overrides.map(o => [o.slug, o]))

  // Build excluded set from overrides
  const excludedSlugs = new Set<string>()
  for (const [slug, o] of overrideMap) {
    if (o.excluded === 1) excludedSlugs.add(slug)
  }

  // Active (non-excluded) TRaSH formats
  const activeUpstream = upstream.filter(f => !excludedSlugs.has(f.slug))
  const upstreamSlugs = new Set(activeUpstream.map(f => f.slug))

  const add: ChangeAdd[] = []
  const updateConditions: ChangeUpdateConditions[] = []
  const updateScores: ChangeUpdateScore[] = []
  const updateProfiles: ChangeProfileUpdate[] = []
  const deprecate: ChangeDeprecate[] = []
  const repair: ChangeRepair[] = []

  // ── Step 1: process TRaSH upstream formats ───────────────────────────────────
  for (const format of activeUpstream) {
    if (!isEnabled(format.slug, overrideMap)) continue

    const finalScore = resolveScore(format.slug, format.recommendedScore, overrideMap)
    const arrId = resolveArrId(instanceId, format.slug)

    if (arrId === null) {
      const liveByName = snapshot.formats.find(f => f.name === format.name)
      if (liveByName) {
        repair.push({
          slug: format.slug,
          arrFormatId: liveByName.id,
          reason: 'missing_in_arr',
          score: finalScore,
          conditions: format.conditions,
          conditionsHash: format.conditionsHash,
        })
      } else {
        add.push({ format, score: finalScore })
      }
      continue
    }

    // User custom formats (source='user'): never update conditions
    if (format.source === 'user') continue

    const lastHash = getLastConditionsHash(instanceId, format.slug)
    if (lastHash !== format.conditionsHash) {
      updateConditions.push({
        slug: format.slug,
        arrFormatId: arrId,
        newConditions: format.conditions,
        newConditionsHash: format.conditionsHash,
      })
    }
  }

  // ── Step 1b: process user custom formats (add if missing; never update conditions) ──
  const userCustomSlugs = new Set(userCustomFormats.map(u => u.slug))
  for (const ucf of userCustomFormats) {
    // Check if it's in arr by its registered ID
    if (ucf.arrFormatId !== null && snapshot.byId.has(ucf.arrFormatId)) continue

    // Check by name if it exists without a registered mapping
    const liveByName = snapshot.formats.find(f => f.name === ucf.name)
    if (liveByName) continue  // exists in arr — don't create a duplicate

    // Not in arr — queue for creation using stored specifications
    add.push({
      format: {
        slug: ucf.slug,
        name: ucf.name,
        conditions: ucf.specifications,
        conditionsHash: '',
        recommendedScore: ucf.score,
        source: 'user',
        schemaVersion: 0,
        trashId: '',
        filePath: '',
        fileSha: '',
        githubSha: '',
        githubCommitDate: '',
      },
      score: ucf.score,
    })
  }

  // ── Step 2: deprecate TRaSH formats absent from ALL active profiles ───────────
  // A format is a candidate only if:
  //   - It has a mapping for this instance
  //   - It is absent from allActiveUpstreamSlugs (covers TRaSH formats + user customs)
  //   - It is not a user custom format
  //   - It is not already deprecated
  const { getAllMappings } = require('./format-id-resolver') as typeof import('./format-id-resolver')
  const allMappings = getAllMappings(instanceId)
  for (const mapping of allMappings) {
    if (allActiveUpstreamSlugs.has(mapping.slug)) continue   // still active in some profile
    if (userCustomSlugs.has(mapping.slug)) continue          // never deprecate user customs
    if (deprecatedSlugs.has(mapping.slug)) continue          // already deprecated
    if (!upstreamSlugs.has(mapping.slug) && !allActiveUpstreamSlugs.has(mapping.slug)) {
      const liveFormat = snapshot.byId.get(mapping.arr_format_id)
      if (!liveFormat) continue
      deprecate.push({
        slug: mapping.slug,
        arrFormatId: mapping.arr_format_id,
        name: liveFormat.name,
      })
    }
  }

  // ── Step 3: profile score diff ────────────────────────────────────────────────
  if (selectedProfile) {
    const profileUpdate = buildProfileChanges(selectedProfile, instanceId, snapshot, overrideMap, excludedSlugs)
    if (profileUpdate) updateProfiles.push(profileUpdate)
  }

  const isNoOp = (
    add.length === 0 &&
    updateConditions.length === 0 &&
    updateScores.length === 0 &&
    updateProfiles.length === 0 &&
    deprecate.length === 0 &&
    repair.length === 0
  )

  return {
    instanceId,
    profileSlug,
    generatedAt: now,
    githubSha,
    add,
    updateConditions,
    updateScores,
    updateProfiles,
    deprecate,
    repair,
    isNoOp,
  }
}
