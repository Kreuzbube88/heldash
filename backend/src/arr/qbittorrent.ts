import { request, Agent } from 'undici'

const agent = new Agent({
  headersTimeout: 8_000,
  bodyTimeout: 15_000,
  connect: { rejectUnauthorized: false }, // homelab self-signed certs
})

export interface QBittorrentTransferInfo {
  dl_info_speed: number    // bytes/s
  up_info_speed: number    // bytes/s
  dl_info_data: number     // bytes downloaded this session
  up_info_data: number     // bytes uploaded this session
  dl_rate_limit: number    // bytes/s (0 = no limit)
  up_rate_limit: number
  dht_nodes: number
  connection_status: string  // 'connected' | 'firewalled' | 'disconnected'
}

export interface QBittorrentTorrent {
  hash: string
  name: string
  state: string      // 'downloading' | 'uploading' | 'pausedDL' | 'pausedUP' | 'stalledDL' | 'stalledUP' | 'error' | 'queuedDL' | 'queuedUP' | ...
  progress: number   // 0.0–1.0
  dlspeed: number    // bytes/s
  upspeed: number    // bytes/s
  eta: number        // seconds; 8640000 = infinite
  size: number       // bytes
  downloaded: number // bytes
  ratio: number
  category: string
  added_on: number   // unix epoch
}

export class QBittorrentClient {
  private readonly baseUrl: string
  private sid: string | null = null

  constructor(
    baseUrl: string,
    private readonly username: string,
    private readonly password: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  private async login(): Promise<void> {
    const body = new URLSearchParams({ username: this.username, password: this.password })
    const res = await request(`${this.baseUrl}/api/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: this.baseUrl,
      },
      body: body.toString(),
      dispatcher: agent,
    })

    // drain body
    for await (const _ of res.body) { /* drain */ }

    if (res.statusCode === 403) throw new Error('qBittorrent: IP banned or login failed')
    if (res.statusCode >= 400) throw new Error(`qBittorrent login HTTP ${res.statusCode}`)

    // Parse SID from Set-Cookie header
    const setCookie = res.headers['set-cookie']
    let sidCookie: string | undefined
    if (Array.isArray(setCookie)) {
      sidCookie = setCookie.find(c => c.startsWith('SID='))
    } else if (typeof setCookie === 'string' && setCookie.startsWith('SID=')) {
      sidCookie = setCookie
    }

    if (!sidCookie) throw new Error('qBittorrent: No SID cookie in login response')
    this.sid = sidCookie.split(';')[0].slice(4) // extract value after "SID="
  }

  private async ensureAuth(): Promise<void> {
    if (!this.sid) await this.login()
  }

  private async get<T>(path: string, retried = false): Promise<T> {
    await this.ensureAuth()
    const res = await request(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { Cookie: `SID=${this.sid!}` },
      dispatcher: agent,
    })

    if (res.statusCode === 403 && !retried) {
      // Session expired (e.g. qBittorrent restarted) — re-login once
      this.sid = null
      return this.get<T>(path, true)
    }

    if (res.statusCode >= 400) {
      for await (const _ of res.body) { /* drain */ }
      throw new Error(`qBittorrent HTTP ${res.statusCode} from ${path}`)
    }

    const chunks: Buffer[] = []
    for await (const chunk of res.body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as T
  }

  private async postVoid(path: string, retried = false): Promise<void> {
    await this.ensureAuth()
    const res = await request(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Cookie: `SID=${this.sid!}` },
      dispatcher: agent,
    })

    if (res.statusCode === 403 && !retried) {
      this.sid = null
      return this.postVoid(path, true)
    }

    for await (const _ of res.body) { /* drain */ }

    if (res.statusCode >= 400) {
      throw new Error(`qBittorrent HTTP ${res.statusCode} from ${path}`)
    }
  }

  private async getText(path: string, retried = false): Promise<string> {
    await this.ensureAuth()
    const res = await request(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { Cookie: `SID=${this.sid!}` },
      dispatcher: agent,
    })
    if (res.statusCode === 403 && !retried) {
      this.sid = null
      return this.getText(path, true)
    }
    if (res.statusCode >= 400) {
      for await (const _ of res.body) { /* drain */ }
      throw new Error(`qBittorrent HTTP ${res.statusCode} from ${path}`)
    }
    const chunks: Buffer[] = []
    for await (const chunk of res.body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks).toString('utf-8').trim()
  }

  async ping(): Promise<string> {
    return this.getText('/api/v2/app/version')
  }

  getTransferInfo(): Promise<QBittorrentTransferInfo> {
    return this.get<QBittorrentTransferInfo>('/api/v2/transfer/info')
  }

  getTorrents(filter?: string): Promise<QBittorrentTorrent[]> {
    const qs = filter
      ? `?filter=${encodeURIComponent(filter)}&limit=50`
      : '?limit=50'
    return this.get<QBittorrentTorrent[]>(`/api/v2/torrents/info${qs}`)
  }

  async getAltSpeedMode(): Promise<boolean> {
    const mode = await this.get<number>('/api/v2/transfer/speedLimitsMode')
    return mode === 1
  }

  toggleAltSpeed(): Promise<void> {
    return this.postVoid('/api/v2/transfer/toggleSpeedLimitsMode')
  }
}
