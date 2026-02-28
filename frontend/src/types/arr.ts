export type ArrType = 'radarr' | 'sonarr' | 'prowlarr'

export interface ArrInstance {
  id: string
  type: ArrType
  name: string
  url: string  // for display only — never used for direct API calls from the frontend
  enabled: boolean
  position: number
  created_at: string
}

// ── Status ────────────────────────────────────────────────────────────────────
export interface ArrStatus {
  online: boolean
  type: ArrType
  version?: string
  instanceName?: string
}

// ── Stats (type-discriminated) ────────────────────────────────────────────────
export interface RadarrStats {
  type: 'radarr'
  movieCount: number
  monitored: number
  withFile: number
  sizeOnDisk: number
}

export interface SonarrStats {
  type: 'sonarr'
  seriesCount: number
  monitored: number
  episodeCount: number
  sizeOnDisk: number
}

export interface ProwlarrStats {
  type: 'prowlarr'
  indexerCount: number
  enabledIndexers: number
  grabCount24h: number
}

export type ArrStats = RadarrStats | SonarrStats | ProwlarrStats

// ── Queue ─────────────────────────────────────────────────────────────────────
export interface ArrQueueItem {
  id: number
  title: string
  status: string
  trackedDownloadStatus: string
  size: number
  sizeleft: number
  protocol: string
  downloadClient?: string
  episode?: { title: string; seasonNumber: number; episodeNumber: number }
}

export interface ArrQueueResponse {
  totalRecords: number
  records: ArrQueueItem[]
}

// ── Calendar ──────────────────────────────────────────────────────────────────
export interface RadarrCalendarItem {
  id: number
  title: string
  inCinemas?: string
  digitalRelease?: string
  hasFile: boolean
  monitored: boolean
}

export interface SonarrCalendarItem {
  id: number
  title: string
  seasonNumber: number
  episodeNumber: number
  airDateUtc?: string
  hasFile: boolean
  series: { title: string; id: number }
}

export type ArrCalendarItem = RadarrCalendarItem | SonarrCalendarItem

// ── Prowlarr Indexer ──────────────────────────────────────────────────────────
export interface ProwlarrIndexer {
  id: number
  name: string
  enable: boolean
  protocol: string
  privacy: string
}
