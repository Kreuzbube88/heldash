export interface UnraidInstance {
  id: string; name: string; url: string
  enabled: boolean; position: number
  created_at: string; updated_at: string
}
export interface UnraidOs { platform?: string; distro?: string; release?: string; uptime?: number; hostname?: string }
export interface UnraidCpu { manufacturer?: string; brand?: string; cores?: number; threads?: number }
export interface UnraidMemory { total?: number; free?: number; used?: number }
export interface UnraidBaseboard { manufacturer?: string; model?: string }
export interface UnraidInfo {
  info?: { os?: UnraidOs; cpu?: UnraidCpu; memory?: UnraidMemory; baseboard?: UnraidBaseboard }
  online?: boolean
}
export interface UnraidDisk {
  id?: string; name?: string; device?: string; size?: number; status?: string
  temp?: number | null; rotational?: boolean
  fsSize?: number; fsFree?: number; fsUsed?: number; fsUsedPercent?: number
}
export interface UnraidCapacity { kilobytes?: { free?: number; used?: number; total?: number } }
export interface UnraidArray { array?: { state?: string; capacity?: UnraidCapacity; disks?: UnraidDisk[] } }
export interface UnraidParityHistory { date?: string; duration?: number; speed?: string; status?: string; errors?: number }
export interface UnraidContainer {
  id?: string; names?: string[]; state?: string; status?: string
  image?: string; autoStart?: boolean
  hostConfig?: { networkMode?: string }
}
export interface UnraidVm { uuid?: string; name?: string; state?: string; coreCount?: number; memoryMin?: number; primaryGPU?: string; os?: string; autoStart?: boolean }
export interface UnraidShare { name?: string; comment?: string; security?: string; free?: number; used?: number; size?: number; cacheEnabled?: boolean }
export interface UnraidUser { name?: string; description?: string; role?: string }
export interface UnraidNotification { id?: string; title?: string; subject?: string; description?: string; importance?: string; timestamp?: string }
export interface UnraidNotifications { notifications?: { overview?: { unread?: number; total?: number }; list?: UnraidNotification[] } }
export interface UnraidConfig { config?: { valid?: boolean; error?: string; registrationTo?: string; registrationType?: string } }
