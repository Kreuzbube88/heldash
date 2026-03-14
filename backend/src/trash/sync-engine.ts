import type { TrashCF, TrashProfile } from './github-fetcher'
import type { ArrCustomFormat, ArrQualityProfile } from '../arr/radarr'

export interface UserCustomFormat {
  id: string
  name: string
  specifications: object[]
}

export interface FormatOverride {
  format_slug: string
  score_override: number | null
  excluded: number
}

export interface SyncInput {
  trashFormats: TrashCF[]
  trashProfile: TrashProfile | null
  userCustomFormats: UserCustomFormat[]
  overrides: FormatOverride[]
  arrFormats: ArrCustomFormat[]
  arrProfile: ArrQualityProfile | null
  previousSlugs: string[]
}

export interface ChangeItem {
  slug: string
  name: string
}

export interface ScoreChange {
  slug: string
  name: string
  oldScore: number
  newScore: number
}

export interface Changeset {
  toCreate: ChangeItem[]
  toUpdate: (ChangeItem & { changeDescription: string })[]
  toUpdateScores: ScoreChange[]
  customToCreate: ChangeItem[]
  customToUpdate: ChangeItem[]
  excluded: number
  noChange: number
  trashUpdates: {
    newFormats: ChangeItem[]
    updatedFormats: ChangeItem[]
    removedFromTRaSH: ChangeItem[]
  }
}

function specsEqual(a: object[], b: object[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function computeChangeset(input: SyncInput): Changeset {
  const {
    trashFormats,
    trashProfile,
    userCustomFormats,
    overrides,
    arrFormats,
    arrProfile,
    previousSlugs,
  } = input

  const overrideMap = new Map<string, FormatOverride>()
  for (const o of overrides) {
    overrideMap.set(o.format_slug, o)
  }

  const arrFormatMap = new Map<string, ArrCustomFormat>()
  for (const af of arrFormats) {
    arrFormatMap.set(af.name, af)
  }

  const toCreate: ChangeItem[] = []
  const toUpdate: (ChangeItem & { changeDescription: string })[] = []
  const toUpdateScores: ScoreChange[] = []
  const customToCreate: ChangeItem[] = []
  const customToUpdate: ChangeItem[] = []
  let excluded = 0
  let noChange = 0

  // Process TRaSH formats
  for (const cf of trashFormats) {
    const override = overrideMap.get(cf.slug)
    if (override?.excluded) {
      excluded++
      continue
    }

    const existing = arrFormatMap.get(cf.name)
    if (!existing) {
      toCreate.push({ slug: cf.slug, name: cf.name })
    } else {
      const specsSame = specsEqual(existing.specifications, cf.specifications)
      if (!specsSame) {
        toUpdate.push({
          slug: cf.slug,
          name: cf.name,
          changeDescription: 'Specifications changed',
        })
      } else {
        noChange++
      }
    }
  }

  // Process custom formats
  for (const cf of userCustomFormats) {
    const existing = arrFormatMap.get(cf.name)
    if (!existing) {
      customToCreate.push({ slug: cf.id, name: cf.name })
    } else {
      const specsSame = specsEqual(existing.specifications, cf.specifications)
      if (!specsSame) {
        customToUpdate.push({ slug: cf.id, name: cf.name })
      }
    }
  }

  // Process quality profile score changes
  if (trashProfile && arrProfile) {
    // Build map of CF name → arr format id
    const arrProfileScoreMap = new Map<number, number>()
    for (const fi of arrProfile.formatItems) {
      arrProfileScoreMap.set(fi.format, fi.score)
    }

    // Build name → arr format id map
    const arrFormatIdMap = new Map<string, number>()
    for (const af of arrFormats) {
      arrFormatIdMap.set(af.name, af.id)
    }

    for (const fi of trashProfile.formatItems) {
      // Find the CF by name
      const arrId = arrFormatIdMap.get(fi.name)
      if (arrId === undefined) continue

      const override = overrideMap.get(
        trashFormats.find(cf => cf.name === fi.name)?.slug ?? ''
      )
      if (override?.excluded) continue

      const targetScore = override?.score_override !== null && override?.score_override !== undefined
        ? override.score_override
        : fi.score

      const currentScore = arrProfileScoreMap.get(arrId) ?? 0
      if (currentScore !== targetScore) {
        toUpdateScores.push({
          slug: trashFormats.find(cf => cf.name === fi.name)?.slug ?? fi.name,
          name: fi.name,
          oldScore: currentScore,
          newScore: targetScore,
        })
      }
    }
  }

  // TRaSH updates (what changed in TRaSH guides since last time)
  const previousSlugSet = new Set(previousSlugs)
  const currentSlugSet = new Set(trashFormats.map(cf => cf.slug))
  const currentSlugMap = new Map(trashFormats.map(cf => [cf.slug, cf]))

  const newFormats: ChangeItem[] = []
  const updatedFormats: ChangeItem[] = []
  const removedFromTRaSH: ChangeItem[] = []

  for (const cf of trashFormats) {
    if (!previousSlugSet.has(cf.slug)) {
      newFormats.push({ slug: cf.slug, name: cf.name })
    }
  }

  for (const slug of previousSlugs) {
    const cf = currentSlugMap.get(slug)
    if (!cf) {
      // We don't have the old name easily, just use slug
      removedFromTRaSH.push({ slug, name: slug })
    } else if (toUpdate.some(u => u.slug === slug)) {
      updatedFormats.push({ slug: cf.slug, name: cf.name })
    }
  }

  // Suppress unused variable warning
  void currentSlugSet

  return {
    toCreate,
    toUpdate,
    toUpdateScores,
    customToCreate,
    customToUpdate,
    excluded,
    noChange,
    trashUpdates: { newFormats, updatedFormats, removedFromTRaSH },
  }
}
