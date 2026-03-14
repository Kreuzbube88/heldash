import { ArrBaseClient } from './base-client'

export interface RadarrStatusRow {
  version: string
  instanceName?: string
  isProduction: boolean
}

export interface RadarrMovieRow {
  id: number
  title: string
  monitored: boolean
  hasFile: boolean
  sizeOnDisk: number
  inCinemas?: string
  digitalRelease?: string
  images?: { coverType: string; remoteUrl: string }[]
}

export interface RadarrQueueItem {
  id: number
  title: string
  status: string
  trackedDownloadStatus: string
  size: number
  sizeleft: number
  protocol: string
  downloadClient?: string
}

export interface RadarrQueueResponse {
  totalRecords: number
  records: RadarrQueueItem[]
}

export interface RadarrCalendarItem {
  id: number
  title: string
  inCinemas?: string
  digitalRelease?: string
  hasFile: boolean
  monitored: boolean
}

export interface RadarrHealthItem {
  source: string
  type: string   // 'ok' | 'notice' | 'warning' | 'error'
  message: string
  wikiUrl?: string
}

export interface RadarrDiskSpace {
  path: string
  label: string
  freeSpace: number
  totalSpace: number
}

export interface RadarrWantedResponse {
  totalRecords: number
  records: RadarrMovieRow[]
}

export class RadarrClient extends ArrBaseClient {
  constructor(url: string, apiKey: string) {
    super(url, apiKey, 'v3')
  }

  getMovies() {
    return this.get<RadarrMovieRow[]>('movie')
  }

  getQueue() {
    return this.get<RadarrQueueResponse>('queue', { pageSize: '50', sortKey: 'timeleft', sortDir: 'asc' })
  }

  getCalendar(start: string, end: string) {
    return this.get<RadarrCalendarItem[]>('calendar', { start, end, unmonitored: 'false' })
  }

  getHealth() {
    return this.get<RadarrHealthItem[]>('health')
  }

  getDiskSpace() {
    return this.get<RadarrDiskSpace[]>('diskspace')
  }

  getWantedMissing() {
    return this.get<RadarrWantedResponse>('wanted/missing', { pageSize: '1', monitored: 'true' })
  }

}
