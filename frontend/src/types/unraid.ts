export interface UnraidInstance {
  id: string; name: string; url: string
  enabled: boolean; position: number
  created_at: string; updated_at: string
}
export interface UnraidOs { platform?: string; distro?: string; release?: string; uptime?: string; hostname?: string; arch?: string }
export interface UnraidCpu { manufacturer?: string; brand?: string; cores?: number; threads?: number }
export interface UnraidBaseboard { manufacturer?: string; model?: string; version?: string }
export interface UnraidMemoryLayout { size?: number; type?: string; clockSpeed?: number; manufacturer?: string; formFactor?: string; partNum?: string }
export interface UnraidMetricsMemory { used?: number; total?: number; percentTotal?: number; swapTotal?: number; swapUsed?: number; swapFree?: number; percentSwapTotal?: number }
export interface UnraidMetricsCpu { percentTotal?: number; cpus?: { percentTotal?: number }[] }
export interface UnraidMetrics { memory?: UnraidMetricsMemory; cpu?: UnraidMetricsCpu }
export interface UnraidInfo {
  info?: {
    id?: string; time?: string
    os?: UnraidOs; cpu?: UnraidCpu; baseboard?: UnraidBaseboard
    memory?: { layout?: UnraidMemoryLayout[] }
    system?: { manufacturer?: string; model?: string; virtual?: boolean }
    versions?: { core?: { unraid?: string; api?: string; kernel?: string }; packages?: { docker?: string } }
  }
  metrics?: UnraidMetrics
  vars?: { version?: string; name?: string }
  online?: boolean
}
export interface UnraidDisk {
  id?: string; idx?: number; name?: string; device?: string; size?: number
  status?: string; temp?: number | null; rotational?: boolean
  fsSize?: number; fsFree?: number; fsUsed?: number
  fsUsedPercent?: number | null
  type?: string; isSpinning?: boolean | null; color?: string
}
export interface UnraidCapacity { kilobytes?: { free?: string; used?: string; total?: string } }
export interface UnraidParityCheckStatus {
  status?: string; running?: boolean; paused?: boolean; correcting?: boolean
  progress?: number; errors?: number; speed?: string; date?: string; duration?: number
}
export interface UnraidArray {
  array?: {
    state?: string
    capacity?: UnraidCapacity
    parityCheckStatus?: UnraidParityCheckStatus
    parities?: UnraidDisk[]
    disks?: UnraidDisk[]
    caches?: UnraidDisk[]
  }
}
export interface UnraidParityHistory {
  date?: string; duration?: number; speed?: string; status?: string; errors?: number
  progress?: number; correcting?: boolean; paused?: boolean; running?: boolean
}
export interface UnraidContainerPort { privatePort?: number; publicPort?: number; type?: string; ip?: string }
export interface UnraidContainer {
  id?: string; names?: string[]; state?: string; status?: string
  image?: string; autoStart?: boolean
  hostConfig?: { networkMode?: string }
  ports?: UnraidContainerPort[]
}
export interface UnraidVm {
  id?: string; name?: string; state?: string
}
export interface UnraidShare {
  id?: string; name?: string; comment?: string
  free?: number; used?: number; size?: number
  cache?: string; luksStatus?: string; color?: string
  include?: string[]; exclude?: string[]
}
export interface UnraidUser { name?: string; description?: string; role?: string }
export interface UnraidNotification {
  id?: string; title?: string; subject?: string; description?: string
  importance?: string; link?: string; type?: string
  timestamp?: string; formattedTimestamp?: string
}
export interface UnraidPhysicalDisk {
  id?: string; name?: string; vendor?: string; device?: string; type?: string
  size?: number; serialNum?: string; interfaceType?: string
  smartStatus?: string; temperature?: number | null; isSpinning?: boolean
  partitions?: { name?: string; fsType?: string; size?: number }[]
}
export interface UnraidNotificationCount { info?: number; warning?: number; alert?: number; total?: number }
export interface UnraidNotifications {
  notifications?: {
    overview?: {
      unread?:  UnraidNotificationCount
      archive?: UnraidNotificationCount
    }
    list?: UnraidNotification[]
    archive?: UnraidNotification[]
  }
}
export interface UnraidConfig {
  config?: { valid?: boolean; error?: string; registrationTo?: string; registrationType?: string }
}
export interface UnraidRegistration {
  registration?: { id?: string; type?: string; state?: string; expiration?: string }
  vars?: { version?: string; name?: string; regTo?: string }
}

export interface UnraidService { id?: string; name?: string; online?: boolean; version?: string }
export interface UnraidFlash { id?: string; guid?: string; vendor?: string; product?: string }
export interface UnraidServer { id?: string; guid?: string; name?: string; status?: string; wanip?: string; lanip?: string; localurl?: string; remoteurl?: string }
export interface UnraidOwner { username?: string; url?: string; avatar?: string }
export interface UnraidMe { id?: string; name?: string; description?: string; roles?: string[] }
export interface UnraidNetworkAccess { id?: string; accessUrls?: { type?: string; name?: string; ipv4?: string; ipv6?: string }[] }
export interface UnraidConnect { id?: string; dynamicRemoteAccess?: { enabledType?: string; runningType?: string; error?: string }; cloud?: { cloud?: { status?: string; ip?: string; error?: string } } }
export interface UnraidUpsDevice { id?: string; name?: string; model?: string; status?: string; battery?: { chargeLevel?: number; estimatedRuntime?: number; health?: string }; power?: { inputVoltage?: number; outputVoltage?: number; loadPercentage?: number } }
export interface UnraidUpsConfig { service?: string; upsCable?: string; upsType?: string; device?: string; batteryLevel?: number; minutes?: number; timeout?: number; nisIp?: string; upsName?: string; modelName?: string }
export interface UnraidLogFile { name?: string; path?: string; size?: number; modifiedAt?: string }
export interface UnraidPlugin { name?: string; version?: string; hasApiModule?: boolean; hasCliModule?: boolean }
export interface UnraidApiKey { id?: string; key?: string; name?: string; description?: string; roles?: string[]; createdAt?: string }
export interface UnraidDockerNetwork { id?: string; name?: string; created?: string; driver?: string; scope?: string; enableIPv6?: boolean; internal?: boolean; attachable?: boolean; ingress?: boolean }
export interface UnraidMetricsDetailed { cpu?: { percentTotal?: number; cpus?: { percentTotal?: number; percentUser?: number; percentSystem?: number; percentIdle?: number }[] }; memory?: { total?: number; used?: number; free?: number; available?: number; percentTotal?: number; swapTotal?: number; swapUsed?: number; percentSwapTotal?: number } }
