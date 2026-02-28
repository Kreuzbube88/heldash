import { ArrBaseClient } from './base-client'

export interface ProwlarrStatusRow {
  version: string
  instanceName?: string
  isProduction: boolean
}

export interface ProwlarrIndexerRow {
  id: number
  name: string
  enable: boolean
  protocol: string
  privacy: string
}

export interface ProwlarrIndexerStatsRow {
  indexerId: number
  indexerName: string
  numberOfGrabs: number
  numberOfQueries: number
  numberOfFailedGrabs: number
  numberOfFailedQueries: number
}

export class ProwlarrClient extends ArrBaseClient {
  constructor(url: string, apiKey: string) {
    super(url, apiKey, 'v1')
  }

  getIndexers() {
    return this.get<ProwlarrIndexerRow[]>('indexer')
  }

  getIndexerStats(startDate: string, endDate: string) {
    return this.get<ProwlarrIndexerStatsRow[]>('indexerstats', { startDate, endDate })
  }
}
