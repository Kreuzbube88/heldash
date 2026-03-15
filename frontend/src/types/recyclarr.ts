export interface RecyclarrTemplate {
  slug: string
  name: string
  type: 'profile' | 'custom_formats' | 'quality_definition'
  mediaType: 'radarr' | 'sonarr'
  pairedWith?: string
  group: string
}

export interface RecyclarrTemplatesResponse {
  templates: RecyclarrTemplate[]
  lastFetchedAt: string | null
  warning: boolean
}

export interface RecyclarrScoreOverride {
  trash_id: string
  name: string
  score: number
  profileName: string
}

export interface RecyclarrUserCf {
  name: string
  score: number
  profileName: string
}

export interface RecyclarrProfileConfig {
  slug: string
  min_format_score?: number
  reset_unmatched_scores_enabled: boolean
  reset_unmatched_scores_except: string[]
}

export interface RecyclarrInstanceConfig {
  instanceId: string
  instanceName: string
  instanceType: 'radarr' | 'sonarr'
  enabled: boolean
  templates: string[]
  scoreOverrides: RecyclarrScoreOverride[]
  userCfNames: RecyclarrUserCf[]
  preferredRatio: number
  profilesConfig: RecyclarrProfileConfig[]
  syncSchedule: string
  lastSyncedAt: string | null
  lastSyncSuccess: boolean | null
  deleteOldCfs: boolean
  isSyncing: boolean
}

export interface RecyclarrConfigsResponse {
  configs: RecyclarrInstanceConfig[]
  importWarning?: string
}

export interface RecyclarrCfEntry {
  trash_id: string
  name: string
  defaultScore: number
  profileName: string
}

export interface RecyclarrSyncLine {
  line: string
  type: 'stdout' | 'stderr'
}
