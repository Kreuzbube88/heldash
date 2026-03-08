// ── Pure merge engine ─────────────────────────────────────────────────────────
// No external API calls. No DB writes. Takes pre-loaded data, returns Changeset.

import { resolveArrId, getLastConditionsHash } from './format-id-resolver'
import type {
  NormalizedCustomFormat, NormalizedQualityProfile, ArrSnapshot,
  TrashUserOverride, Changeset,
  ChangeAdd, ChangeUpdateConditions, ChangeUpdateScore,
  ChangeProfileUpdate, ChangeDeprecate, ChangeRepair,
} from './types'

// ── Score resolution (priority: user override → TRaSH default → 0) ───────────

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

// ── Profile score diff helper ─────────────────────────────────────────────────

function buildProfileChanges(
  profile: NormalizedQualityProfile,
  instanceId: string,
  snapshot: ArrSnapshot,
  overrides: Map<string, TrashUserOverride>,
): ChangeProfileUpdate | null {
  const liveProfiles = snapshot.profiles.filter(p => p.name === profile.name)
  if (liveProfiles.length === 0) return null
  const liveProfile = liveProfiles[0]

  // Build O(1) lookup for live profile scores
  const liveScoreById = new Map<number, number>()
  for (const item of liveProfile.formatItems) {
    liveScoreById.set(item.format, item.score)
  }

  const changes: ChangeProfileUpdate['changes'] = []

  for (const fs of profile.formatScores) {
    if (!isEnabled(fs.formatSlug, overrides)) continue

    const arrId = resolveArrId(instanceId, fs.formatSlug)
    if (arrId === null) continue   // Format not yet created in arr

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
// upstream:             Only the TRaSH formats in this specific profile (pre-filtered by caller)
// allActiveUpstreamSlugs: Union of ALL format slugs across all enabled profiles for this instance.
//                       Used for deprecation: only deprecate a mapped format if it is absent
//                       from ALL active profiles, not just the current one.
// profileSlug:          The profile being synced — stored in the returned Changeset.

export function computeChangeset(
  instanceId: string,
  profileSlug: string,
  upstream: NormalizedCustomFormat[],
  allActiveUpstreamSlugs: Set<string>,
  selectedProfile: NormalizedQualityProfile | null,
  snapshot: ArrSnapshot,
  overrides: TrashUserOverride[],
  deprecatedSlugs: Set<string>,
): Changeset {
  const now = new Date().toISOString()
  const githubSha = upstream[0]?.githubSha ?? ''

  // Build override map for O(1) access
  const overrideMap = new Map<string, TrashUserOverride>(overrides.map(o => [o.slug, o]))

  const upstreamSlugs = new Set(upstream.map(f => f.slug))

  const add: ChangeAdd[] = []
  const updateConditions: ChangeUpdateConditions[] = []
  const updateScores: ChangeUpdateScore[] = []
  const updateProfiles: ChangeProfileUpdate[] = []
  const deprecate: ChangeDeprecate[] = []
  const repair: ChangeRepair[] = []

  // ── Step 1: process upstream formats ────────────────────────────────────────
  for (const format of upstream) {
    if (!isEnabled(format.slug, overrideMap)) continue

    const finalScore = resolveScore(format.slug, format.recommendedScore, overrideMap)
    const arrId = resolveArrId(instanceId, format.slug)

    if (arrId === null) {
      // Format not in mapping → check if it exists by name in arr
      const liveByName = snapshot.formats.find(f => f.name === format.name)
      if (liveByName) {
        // Exists in arr but no mapping — treat as repair (will re-register mapping)
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

    // Format is mapped — check conditions hash
    const lastHash = getLastConditionsHash(instanceId, format.slug)
    if (lastHash !== format.conditionsHash) {
      updateConditions.push({
        slug: format.slug,
        arrFormatId: arrId,
        newConditions: format.conditions,
        newConditionsHash: format.conditionsHash,
      })
    }

    // Score drift is handled in profile diff (Phase C)
    if (!selectedProfile) {
      void snapshot.byId.get(arrId)  // no-op without a profile
    }
  }

  // ── Step 2: deprecate formats no longer in ANY active profile ────────────────
  // A format is a deprecation candidate only if:
  //   - It has a mapping for this instance (we manage it)
  //   - It is absent from allActiveUpstreamSlugs (removed from all active profiles)
  //   - It is not already in the deprecated set
  const { getAllMappings } = require('./format-id-resolver') as typeof import('./format-id-resolver')
  const allMappings = getAllMappings(instanceId)
  for (const mapping of allMappings) {
    if (allActiveUpstreamSlugs.has(mapping.slug)) continue   // still in some active profile
    if (deprecatedSlugs.has(mapping.slug)) continue          // already deprecated
    if (!upstreamSlugs.has(mapping.slug) && !allActiveUpstreamSlugs.has(mapping.slug)) {
      // Only emit deprecation on the first profile sync that detects it
      // (the slug is not in THIS profile's upstream either)
      const liveFormat = snapshot.byId.get(mapping.arr_format_id)
      if (!liveFormat) continue  // already gone from arr
      deprecate.push({
        slug: mapping.slug,
        arrFormatId: mapping.arr_format_id,
        name: liveFormat.name,
      })
    }
  }

  // ── Step 3: profile score diff ────────────────────────────────────────────────
  if (selectedProfile) {
    const profileUpdate = buildProfileChanges(selectedProfile, instanceId, snapshot, overrideMap)
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
