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

export interface RecyclarrInstanceConfig {
  instanceId: string
  instanceName: string
  instanceType: 'radarr' | 'sonarr'
  enabled: boolean
  templates: string[]
  scoreOverrides: RecyclarrScoreOverride[]
  userCfNames: RecyclarrUserCf[]
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
