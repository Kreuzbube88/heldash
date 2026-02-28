import { request, Agent } from 'undici'

const agent = new Agent({
  headersTimeout: 8_000,
  bodyTimeout: 15_000,
  connect: { rejectUnauthorized: false }, // homelab self-signed certs
})

export class ArrBaseClient {
  private readonly apiBase: string

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    apiVersion: 'v1' | 'v3',
  ) {
    this.apiBase = `${baseUrl.replace(/\/$/, '')}/api/${apiVersion}`
  }

  protected async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    let url = `${this.apiBase}/${endpoint}`
    if (params && Object.keys(params).length > 0) {
      url += '?' + new URLSearchParams(params).toString()
    }

    const res = await request(url, {
      method: 'GET',
      headers: { 'X-Api-Key': this.apiKey },
      dispatcher: agent,
    })

    if (res.statusCode >= 400) {
      // Drain body before throwing
      for await (const _ of res.body) { /* drain */ }
      throw new Error(`HTTP ${res.statusCode} from ${url}`)
    }

    const chunks: Buffer[] = []
    for await (const chunk of res.body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return JSON.parse(chunks.length ? Buffer.concat(chunks).toString('utf-8') : 'null') as T
  }

  /** Quick reachability check — returns true if /system/status responds */
  async ping(): Promise<boolean> {
    try {
      await this.get<unknown>('system/status')
      return true
    } catch {
      return false
    }
  }

  getSystemStatus(): Promise<{ version: string; instanceName?: string }> {
    return this.get('system/status')
  }
}
