export interface TRaSHProfile {
  slug: string
  name: string
}

export interface TrashInstanceConfig {
  profile_slug: string | null
}

export interface TrashFormatListEntry {
  slug: string
  name: string
  source: 'trash' | 'custom'
  defaultScore: number
  scoreOverride: number | null
  excluded: boolean
  specifications?: object[]
}

export interface TrashChangeItem {
  slug: string
  name: string
}

export interface TrashScoreChange {
  slug: string
  name: string
  oldScore: number
  newScore: number
}

export interface TrashChangeset {
  toCreate: TrashChangeItem[]
  toUpdate: (TrashChangeItem & { changeDescription: string })[]
  toUpdateScores: TrashScoreChange[]
  customToCreate: TrashChangeItem[]
  customToUpdate: TrashChangeItem[]
  excluded: number
  noChange: number
  trashUpdates: {
    newFormats: TrashChangeItem[]
    updatedFormats: TrashChangeItem[]
    removedFromTRaSH: TrashChangeItem[]
  }
}

export interface TrashApplyResult {
  created: number
  updated: number
  scoresUpdated: number
  skipped: number
  errors: string[]
}

export interface TrashCacheInfo {
  fetchedAt: string | null
  fromCache: boolean
}
