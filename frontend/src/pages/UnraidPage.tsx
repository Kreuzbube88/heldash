import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store/useStore'
import { useUnraidStore } from '../store/useUnraidStore'
import { useToast } from '../components/Toast'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Server, Settings2, GripVertical, Plus, RefreshCw, Play, Square, RotateCcw,
  Pause, ChevronUp, ChevronDown, Trash2, Eye, EyeOff, AlertTriangle, Check,
  Download, Zap, SkipForward, HardDrive, Cpu,
  Monitor, Clock, Globe, Shield, Users, Key, Tag, Layers,
  Activity, Network, Package,
} from 'lucide-react'
import type { UnraidInstance, UnraidContainer, UnraidVm, UnraidPhysicalDisk, UnraidNotification } from '../types/unraid'
import { api } from '../api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '–'
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  if (gb < 1024) return `${gb.toFixed(2)} GB`
  return `${(gb / 1024).toFixed(2)} TB`
}

function formatKilobytes(kb?: number | string | null): string {
  const n = typeof kb === 'string' ? parseInt(kb, 10) : (kb ?? 0)
  if (!n || n === 0) return '–'
  if (n < 1024)       return `${n} KB`
  if (n < 1048576)    return `${(n / 1024).toFixed(1)} MB`
  if (n < 1073741824) return `${(n / 1048576).toFixed(2)} GB`
  return `${(n / 1073741824).toFixed(2)} TB`
}

function formatUptime(uptime?: string): string {
  if (!uptime) return '–'
  const bootTime = new Date(uptime).getTime()
  if (isNaN(bootTime)) return uptime
  const seconds = Math.floor((Date.now() - bootTime) / 1000)
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}T`)
  if (h > 0) parts.push(`${h}Std`)
  if (m > 0 || parts.length === 0) parts.push(`${m}Min`)
  return parts.join(' ')
}

function formatRelative(ts?: string): string {
  if (!ts) return '–'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `vor ${m} Min`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h} Std`
  return `vor ${Math.floor(h / 24)} Tagen`
}

function arrayStateBadgeStyle(state?: string): { color: string; background: string } {
  switch (state) {
    case 'STARTED':
    case 'started':
      return { color: 'var(--status-online)', background: 'rgba(34,197,94,0.12)' }
    case 'STOPPED':
    case 'stopped':
      return { color: 'var(--text-muted)', background: 'rgba(128,128,128,0.12)' }
    case 'RECON_DISK':
    case 'DISABLE_DISK':
    case 'SWAP_DSBL':
    case 'NEW_ARRAY':
      return { color: 'var(--warning)', background: 'rgba(234,179,8,0.12)' }
    default:
      return { color: 'var(--status-offline)', background: 'rgba(239,68,68,0.12)' }
  }
}

function pendingBadge(action: string): { label: string; color: string; bg: string; pulse: boolean } {
  switch (action) {
    case 'start':   return { label: 'Startet…',  color: 'var(--warning)', bg: 'rgba(234,179,8,0.12)',  pulse: true  }
    case 'stop':    return { label: 'Stoppt…',   color: 'var(--text-muted)', bg: 'rgba(128,128,128,0.12)', pulse: false }
    case 'restart': return { label: 'Neustart…', color: 'var(--warning)', bg: 'rgba(234,179,8,0.12)',  pulse: true  }
    case 'pause':   return { label: 'Pausiert…', color: 'var(--accent)',  bg: 'rgba(99,102,241,0.12)', pulse: false }
    case 'unpause': return { label: 'Startet…',  color: 'var(--warning)', bg: 'rgba(234,179,8,0.12)',  pulse: true  }
    case 'reboot':
    case 'reset':   return { label: 'Neustart…', color: 'var(--warning)', bg: 'rgba(234,179,8,0.12)',  pulse: true  }
    case 'forcestop': return { label: 'Stoppt…', color: 'var(--text-muted)', bg: 'rgba(128,128,128,0.12)', pulse: false }
    case 'resume':  return { label: 'Startet…',  color: 'var(--warning)', bg: 'rgba(234,179,8,0.12)',  pulse: true  }
    default:        return { label: 'Warten…',   color: 'var(--text-muted)', bg: 'rgba(128,128,128,0.12)', pulse: true }
  }
}

function containerStateBadge(state?: string): { label: string; color: string; bg: string; pulse: boolean } {
  switch (state) {
    case 'RUNNING':
      return { label: 'Running', color: 'var(--status-online)',  bg: 'rgba(34,197,94,0.12)',   pulse: true  }
    case 'PAUSED':
      return { label: 'Paused',  color: 'var(--warning)',        bg: 'rgba(234,179,8,0.12)',   pulse: false }
    case 'EXITED':
      return { label: 'Stopped', color: 'var(--text-muted)',     bg: 'rgba(128,128,128,0.12)', pulse: false }
    default:
      return { label: state ?? '?', color: 'var(--text-muted)', bg: 'rgba(128,128,128,0.12)', pulse: false }
  }
}

function vmStateBadge(state?: string): { label: string; color: string; bg: string; pulse: boolean } {
  switch (state) {
    case 'RUNNING':
      return { label: 'Running',       color: 'var(--status-online)',  bg: 'rgba(34,197,94,0.12)',   pulse: true  }
    case 'IDLE':
      return { label: 'Idle',          color: 'var(--accent)',         bg: 'rgba(99,102,241,0.12)',  pulse: false }
    case 'PAUSED':
      return { label: 'Paused',        color: 'var(--warning)',        bg: 'rgba(234,179,8,0.12)',   pulse: false }
    case 'SHUTDOWN':
      return { label: 'Shutting down', color: 'var(--warning)',        bg: 'rgba(234,179,8,0.12)',   pulse: false }
    case 'SHUTOFF':
      return { label: 'Off',           color: 'var(--text-muted)',     bg: 'rgba(128,128,128,0.12)', pulse: false }
    case 'CRASHED':
      return { label: 'Crashed',       color: 'var(--status-offline)', bg: 'rgba(239,68,68,0.12)',   pulse: false }
    case 'PMSUSPENDED':
      return { label: 'Suspended',     color: 'var(--text-secondary)', bg: 'rgba(128,128,128,0.12)', pulse: false }
    default:
      return { label: state ?? '?',    color: 'var(--text-muted)',     bg: 'rgba(128,128,128,0.12)', pulse: false }
  }
}

function formatParitySpeed(speed?: string | number | null): string {
  if (!speed) return '–'
  const raw = typeof speed === 'string' ? speed : String(speed)
  if (raw.includes('MB') || raw.includes('GB') || raw.toLowerCase().includes('kb')) return raw
  const n = parseFloat(raw)
  if (isNaN(n)) return raw
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(1)} GB/s`
  if (n >= 1_048_576)     return `${(n / 1_048_576).toFixed(1)} MB/s`
  if (n >= 1_024)         return `${(n / 1_024).toFixed(0)} KB/s`
  return `${n} B/s`
}

function smartStatusStyle(status?: string): { color: string; label: string } {
  switch (status) {
    case 'OK':
    case 'PASSED':
      return { color: 'var(--status-online)',  label: status }
    case 'UNKNOWN':
      return { color: 'var(--text-muted)',     label: 'Unbekannt' }
    default:
      return { color: 'var(--status-offline)', label: status ?? '–' }
  }
}

function diskTypeBadge(interfaceType?: string, type?: string): { label: string; color: string } {
  if (interfaceType === 'PCIE' || type?.toLowerCase().includes('nvme')) {
    return { label: 'NVMe', color: 'var(--accent)' }
  }
  if (type?.toLowerCase().includes('ssd')) {
    return { label: 'SSD', color: 'var(--warning)' }
  }
  return { label: 'HDD', color: 'var(--text-muted)' }
}

function cacheDiskTypeBadge(disk: { rotational?: boolean; type?: string; device?: string }): { label: string; color: string } {
  if (disk.device?.toLowerCase().includes('nvme') || disk.type?.toLowerCase().includes('nvme')) return { label: 'NVMe', color: 'var(--accent)' }
  if (disk.type?.toLowerCase().includes('ssd') || disk.rotational === false) return { label: 'SSD', color: 'var(--warning)' }
  if (disk.rotational === true) return { label: 'HDD', color: 'var(--text-muted)' }
  return { label: '–', color: 'var(--text-muted)' }
}

function actionButton(
  label: string,
  icon: React.ReactNode,
  onClick: () => void,
  variant: 'green' | 'red' | 'yellow' | 'blue' | 'gray',
  disabled: boolean,
  loading?: boolean,
) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    green:  { bg: 'rgba(34,197,94,0.15)',  color: 'var(--status-online)',  border: 'rgba(34,197,94,0.3)'   },
    red:    { bg: 'rgba(239,68,68,0.15)',  color: 'var(--status-offline)', border: 'rgba(239,68,68,0.3)'   },
    yellow: { bg: 'rgba(234,179,8,0.15)',  color: 'var(--warning)',        border: 'rgba(234,179,8,0.3)'   },
    blue:   { bg: 'rgba(99,102,241,0.15)', color: 'var(--accent)',         border: 'rgba(99,102,241,0.3)'  },
    gray:   { bg: 'rgba(128,128,128,0.1)', color: 'var(--text-muted)',     border: 'rgba(128,128,128,0.2)' },
  }
  const s = disabled ? styles.gray : styles[variant]
  return (
    <button
      key={label}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 'var(--radius-sm)',
        fontSize: 12, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: s.bg, color: s.color,
        border: `1px solid ${s.border}`,
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--transition-fast)',
      }}
    >
      {loading
        ? <div className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
        : icon}
      {label}
    </button>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 0', borderBottom: '1px solid var(--border-subtle, rgba(128,128,128,0.1))',
    }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: 12, minWidth: 130, flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }}>{value ?? '–'}</span>
    </div>
  )
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────

function ConfirmModal({ title, message, onConfirm, onCancel, danger = false, children }: {
  title: string; message: string
  onConfirm: () => void; onCancel: () => void
  danger?: boolean; children?: React.ReactNode
}) {
  const { t } = useTranslation('unraid')
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content glass" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{message}</p>
          {children}
        </div>
        <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel}>{t('confirm.cancel')}</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{t('confirm.ok')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Setup Screen ──────────────────────────────────────────────────────────────

function SetupScreen({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { t } = useTranslation('unraid')
  return (
    <div style={{ maxWidth: 560, margin: '80px auto', padding: '0 var(--spacing-md)' }}>
      <div className="glass" style={{ padding: 'var(--spacing-2xl)', borderRadius: 'var(--radius-xl)', textAlign: 'center' }}>
        <Server size={40} style={{ color: 'var(--accent)', marginBottom: 'var(--spacing-md)' }} />
        <h2 style={{ margin: '0 0 var(--spacing-sm)', fontFamily: 'var(--font-display)' }}>{t('setup.title')}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xl)' }}>{t('setup.requires')}</p>

        <div className="glass" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)', textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
            <span style={{ background: 'var(--accent)', color: '#000', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>1</span>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('setup.api_key_step')}</div>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 13 }}>
                Unraid WebGUI → Settings → Management Access → API Keys → "Create"<br />
                {t('setup.api_key_hint')}
              </p>
            </div>
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => onNavigate?.('instances')} style={{ width: '100%', gap: 6, justifyContent: 'center' }}>
          <Plus size={14} /> {t('instance.add')}
        </button>
      </div>
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ instanceId }: { instanceId: string }) {
  const { t } = useTranslation('unraid')
  const { info, array, notifications, loadInfo, loadArray, loadNotifications, errors } = useUnraidStore()
  const data = info[instanceId]
  const arrData = array[instanceId]
  const notifData = notifications[instanceId]

  useEffect(() => {
    loadInfo(instanceId)
    loadArray(instanceId)
    loadNotifications(instanceId)
    const t1 = setInterval(() => loadInfo(instanceId), 15_000)
    const t2 = setInterval(() => loadArray(instanceId), 30_000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [instanceId])

  const os = data?.info?.os
  const cpu = data?.info?.cpu
  const memory = data?.metrics?.memory
  const cpuMetrics = data?.metrics?.cpu
  const baseboard = data?.info?.baseboard
  const versions = data?.info?.versions
  const sysInfo = data?.info?.system
  const arrState = arrData?.array?.state
  const cap = arrData?.array?.capacity?.kilobytes
  const unreadObj = notifData?.notifications?.overview?.unread
  const unread = unreadObj?.total ?? ((unreadObj?.info ?? 0) + (unreadObj?.warning ?? 0) + (unreadObj?.alert ?? 0))
  const warnings = (notifData?.notifications?.list ?? []).filter(n => n.importance === 'ALERT' || n.importance === 'WARNING')
  const err = errors[`info_${instanceId}`]

  const importanceColor = (imp?: string) => {
    if (imp === 'ALERT') return 'var(--status-offline)'
    if (imp === 'WARNING') return 'var(--warning)'
    return 'var(--accent)'
  }

  const cpuPct = cpuMetrics?.percentTotal ?? 0
  const cpuBarColor = cpuPct < 70 ? 'var(--accent)' : cpuPct < 90 ? 'var(--warning)' : 'var(--status-offline)'

  return (
    <div>
      {err && <div className="error-banner" style={{ marginBottom: 'var(--spacing-md)' }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--spacing-md)' }}>
        <div className="glass" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t('overview.server')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{os?.hostname ?? '–'}</h3>
            {sysInfo?.virtual && <span style={{ background: '#8b5cf6', color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>VM</span>}
            {versions?.core?.unraid && <span style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)', borderRadius: 4, padding: '1px 6px', fontSize: 11 }}>Unraid {versions.core.unraid}</span>}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{sysInfo?.manufacturer} {sysInfo?.model}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{t('overview.uptime_label')} {formatUptime(os?.uptime)}</div>
        </div>

        <div className="glass" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Cpu size={12} /> CPU</div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{cpu?.manufacturer} {cpu?.brand}</div>
          <div style={{ background: 'var(--glass-bg)', borderRadius: 4, height: 6, marginBottom: 4 }}>
            <div style={{ background: cpuBarColor, height: '100%', borderRadius: 4, width: `${cpuPct.toFixed(0)}%`, transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{cpu?.cores} {t('overview.cores')} / {cpu?.threads} {t('overview.threads')}</span>
            <span>{cpuPct.toFixed(1)}%</span>
          </div>
        </div>

        <div className="glass" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>RAM</div>
          {memory?.total ? (
            <>
              <div style={{ background: 'var(--glass-bg)', borderRadius: 4, height: 6, marginBottom: 4 }}>
                <div style={{ background: 'var(--accent)', height: '100%', borderRadius: 4, width: `${(memory.percentTotal ?? 0).toFixed(0)}%` }} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{formatBytes(memory.used)} / {formatBytes(memory.total)}</span>
                <span style={{ color: 'var(--text-muted)' }}>{(memory.percentTotal ?? 0).toFixed(1)}%</span>
              </div>
              {(memory.swapTotal ?? 0) > 0 && (
                <>
                  <div style={{ background: 'var(--glass-bg)', borderRadius: 4, height: 4, marginTop: 8, marginBottom: 3 }}>
                    <div style={{ background: '#8b5cf6', height: '100%', borderRadius: 4, width: `${(memory.percentSwapTotal ?? 0).toFixed(0)}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t('overview.swap')} {formatBytes(memory.swapUsed)} / {formatBytes(memory.swapTotal)}</span>
                    <span>{(memory.percentSwapTotal ?? 0).toFixed(1)}%</span>
                  </div>
                </>
              )}
            </>
          ) : <div style={{ color: 'var(--text-muted)' }}>–</div>}
        </div>

        <div className="glass" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t('overview.mainboard')}</div>
          <div style={{ fontWeight: 600 }}>{baseboard?.manufacturer ?? '–'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{baseboard?.model ?? ''}</div>
        </div>

        <div className="glass" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t('overview.array_label')}</div>
          <span style={{ ...arrayStateBadgeStyle(arrState), borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{arrState ?? '–'}</span>
          {cap && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{formatKilobytes(parseInt(cap.used ?? '0', 10))} / {formatKilobytes(parseInt(cap.total ?? '1', 10))}</div>}
        </div>

        <div className="glass" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{t('overview.notifications_label')}</div>
          {unread === 0
            ? <span style={{ color: 'var(--status-online)', background: 'rgba(34,197,94,0.12)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{t('overview.all_ok')}</span>
            : <span style={{ color: 'var(--warning)', background: 'rgba(234,179,8,0.12)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{t('overview.unread', { count: unread })}</span>
          }
          {warnings.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {warnings.slice(0, 3).map((w, i) => (
                <div key={w.id ?? i} style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'flex-start', borderLeft: `3px solid ${importanceColor(w.importance)}`, paddingLeft: 6 }}>
                  <span style={{ flex: 1, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{w.title ?? w.subject}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Array Tab ─────────────────────────────────────────────────────────────────

function ArrayTab({ instanceId }: { instanceId: string }) {
  const { t } = useTranslation('unraid')
  const { array, parity, physicalDisks, loadArray, loadParity, loadPhysicalDisks, arrayStart, arrayStop, parityStart, parityPause, parityResume, parityCancel, errors } = useUnraidStore()
  const { isAdmin } = useStore()
  const { toast } = useToast()
  const arrData = array[instanceId]
  const parityHistory = parity[instanceId] ?? []

  const [confirm, setConfirm] = useState<{ action: string; msg: string; extra?: React.ReactNode; onConfirm?: () => void } | null>(null)
  const [parityCorrect, setParityCorrect] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showCaches, setShowCaches] = useState(false)
  const [showPhysical, setShowPhysical] = useState(false)
  const pdisks = physicalDisks[instanceId] ?? []

  useEffect(() => {
    loadArray(instanceId)
    loadParity(instanceId)
    loadPhysicalDisks(instanceId)
    const t = setInterval(() => loadArray(instanceId), 15_000)
    return () => clearInterval(t)
  }, [instanceId])

  const arrState = (arrData?.array?.state ?? '').toLowerCase()
  const cap = arrData?.array?.capacity?.kilobytes
  const pcs = arrData?.array?.parityCheckStatus
  const parities = arrData?.array?.parities ?? []
  const disks = arrData?.array?.disks ?? []
  const caches = arrData?.array?.caches ?? []
  const isParityRunning = /resyncing|syncing|check/.test(arrState)
  const isParityPaused = /paused/.test(arrState)
  const err = errors[`array_${instanceId}`]

  const diskStatusColor = (s?: string) => {
    if (s === 'DISK_OK') return 'var(--status-online)'
    if (s === 'DISK_NP') return 'var(--text-muted)'
    if (s === 'DISK_DSBL') return 'var(--status-offline)'
    if (s === 'DISK_NEW') return '#3b82f6'
    return 'var(--warning)'
  }

  const tempColor = (t?: number | null) => {
    if (t == null) return 'var(--text-muted)'
    if (t < 40) return 'var(--status-online)'
    if (t <= 50) return 'var(--warning)'
    return 'var(--status-offline)'
  }

  const usedPct = cap ? (parseInt(cap.used ?? '0', 10) / (parseInt(cap.total ?? '1', 10) || 1) * 100) : 0
  const barColor = usedPct < 80 ? 'var(--accent)' : usedPct < 90 ? 'var(--warning)' : 'var(--status-offline)'

  const runConfirm = useCallback(async (action: string) => {
    setConfirm(null)
    try {
      if (action === 'arrayStart') { await arrayStart(instanceId); toast({ message: 'Array gestartet', type: 'success' }) }
      else if (action === 'arrayStop') { await arrayStop(instanceId); toast({ message: 'Array gestoppt', type: 'success' }) }
      else if (action === 'parityStart') { await parityStart(instanceId, parityCorrect); toast({ message: 'Parity Check gestartet', type: 'success' }) }
      else if (action === 'parityCancel') { await parityCancel(instanceId); toast({ message: 'Parity Check abgebrochen', type: 'success' }) }
    } catch (e) {
      toast({ message: (e as Error).message, type: 'error' })
    }
  }, [instanceId, parityCorrect])

  const diskColorToStatus = (color?: string) => {
    if (!color) return undefined
    if (color.startsWith('RED')) return 'var(--status-offline)'
    if (color.startsWith('YELLOW')) return 'var(--warning)'
    if (color.startsWith('GREEN')) return 'var(--status-online)'
    if (color.startsWith('BLUE')) return '#3b82f6'
    return 'var(--text-muted)'
  }

  return (
    <div>
      {err && <div className="error-banner" style={{ marginBottom: 'var(--spacing-md)' }}>{err}</div>}

      {isAdmin && (
        <div className="glass" style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <span style={{ ...arrayStateBadgeStyle(arrState), borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700, marginRight: 'var(--spacing-sm)', letterSpacing: '0.03em' }}>{arrState || '–'}</span>
          {arrState === 'stopped' && <button className="btn btn-primary" onClick={() => setConfirm({ action: 'arrayStart', msg: t('array_tab.array_start_confirm') })}><Play size={14} /> {t('array_tab.array_start')}</button>}
          {arrState === 'started' && <button className="btn btn-danger" onClick={() => setConfirm({ action: 'arrayStop', msg: t('array_tab.array_stop_confirm') })}><Square size={14} /> {t('array_tab.array_stop')}</button>}
          {arrState === 'started' && !isParityRunning && !isParityPaused && (
            <button className="btn btn-primary" onClick={() => setConfirm({ action: 'parityStart', msg: t('array_tab.parity_start_confirm'), extra: (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
                <input type="checkbox" checked={parityCorrect} onChange={e => setParityCorrect(e.target.checked)} />
                {t('array_tab.parity_auto_correct')}
              </label>
            ) })}>{t('array_tab.parity_start')}</button>
          )}
          {isParityRunning && <>
            <button className="btn" onClick={() => parityPause(instanceId).then(() => toast({ message: t('array_tab.parity_paused_toast'), type: 'success' })).catch(e => toast({ message: (e as Error).message, type: 'error' }))}><Pause size={14} /> {t('array_tab.parity_pause')}</button>
            <button className="btn btn-danger" onClick={() => setConfirm({ action: 'parityCancel', msg: t('array_tab.parity_cancel_confirm') })}>{t('array_tab.parity_cancel_btn')}</button>
          </>}
          {isParityPaused && <>
            <button className="btn btn-primary" onClick={() => parityResume(instanceId).then(() => toast({ message: t('array_tab.parity_resumed_toast'), type: 'success' })).catch(e => toast({ message: (e as Error).message, type: 'error' }))}><Play size={14} /> {t('array_tab.parity_resume')}</button>
            <button className="btn btn-danger" onClick={() => setConfirm({ action: 'parityCancel', msg: t('array_tab.parity_cancel_confirm') })}>{t('array_tab.parity_cancel_btn')}</button>
          </>}
        </div>
      )}

      {cap && (
        <div className="glass" style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span>{formatKilobytes(parseInt(cap.used ?? '0', 10))} / {formatKilobytes(parseInt(cap.total ?? '1', 10))}</span>
            <span>{usedPct.toFixed(1)}%</span>
          </div>
          <div style={{ background: 'var(--glass-bg)', borderRadius: 4, height: 8 }}>
            <div style={{ background: barColor, height: '100%', borderRadius: 4, width: `${usedPct.toFixed(1)}%`, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {(isParityRunning || isParityPaused) && pcs && (
        <div className="glass" style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)', borderLeft: `4px solid ${isParityPaused ? 'var(--warning)' : 'var(--accent)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{t('array_tab.parity_check_label')} {isParityPaused ? `(${t('array.paused')})` : t('array.running')}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(pcs.progress ?? 0).toFixed(1)}%</span>
          </div>
          <div style={{ background: 'var(--glass-bg)', borderRadius: 4, height: 6, marginBottom: 8 }}>
            <div style={{ background: isParityPaused ? 'var(--warning)' : 'var(--accent)', height: '100%', borderRadius: 4, width: `${pcs.progress ?? 0}%`, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            {pcs.speed && <span>{t('array_tab.parity_speed')} {pcs.speed}</span>}
            {pcs.errors != null && <span style={{ color: pcs.errors > 0 ? 'var(--status-offline)' : 'var(--text-muted)' }}>{t('array_tab.parity_errors')} {pcs.errors}</span>}
            {pcs.correcting && <span style={{ color: 'var(--warning)' }}>{t('array_tab.parity_correcting')}</span>}
          </div>
        </div>
      )}

      {(parities.length > 0 || disks.length > 0) && (
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>Array</div>
          <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '22%' }} /><col style={{ width: '14%' }} /><col style={{ width: '12%' }} />
                <col style={{ width: '17%' }} /><col style={{ width: '17%' }} /><col style={{ width: '12%' }} />
                <col style={{ width: '6%' }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[t('disk.name'), t('disk.status'), t('disk.type'), t('disk.size'), t('disk.used'), t('disk.free'), t('disk.temp')].map(h => (
                    <th key={h} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...parities.map(d => ({ ...d, _section: 'parity' })), ...disks.map(d => ({ ...d, _section: 'data' }))].map((disk, i) => (
                  <tr key={disk.id ?? i} style={{ borderBottom: '1px solid var(--glass-border)', opacity: disk.status === 'DISK_NP' ? 0.5 : 1 }}>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 500 }}>{disk.name ?? '–'}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {disk.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: diskColorToStatus(disk.color), flexShrink: 0, display: 'inline-block' }} />}
                        <span style={{ background: diskStatusColor(disk.status), color: disk.status === 'DISK_OK' ? '#000' : 'var(--text-primary)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600 }}>{disk.status ?? '–'}</span>
                      </div>
                    </td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                      <span style={{ background: disk._section === 'parity' ? '#8b5cf6' : 'var(--accent)', color: '#000', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 600 }}>{disk._section === 'parity' ? t('array_tab.disk_parity_badge') : t('array_tab.disk_data_badge')}</span>
                    </td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>{formatKilobytes(disk.size)}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>{formatKilobytes(disk.fsUsed)}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>{formatKilobytes(disk.fsFree)}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: tempColor(disk.temp) }}>
                      {disk.temp != null ? `${disk.temp}°C` : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 'var(--spacing-md)' }}>
        <button className="btn" onClick={() => setShowCaches(v => !v)} style={{ width: '100%', textAlign: 'left', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{t('array_tab.cache_pools')} {caches.length > 0 ? `(${caches.length})` : ''}</span>
          {showCaches ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showCaches && (
          caches.length === 0 ? (
            <div style={{ padding: 'var(--spacing-md)', color: 'var(--text-muted)', fontSize: 13 }}>{t('array_tab.cache_pools_empty')}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, borderTop: '1px solid var(--border)', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '22%' }} /><col style={{ width: '14%' }} /><col style={{ width: '12%' }} />
                <col style={{ width: '17%' }} /><col style={{ width: '17%' }} /><col style={{ width: '12%' }} />
                <col style={{ width: '6%' }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[t('disk.name'), t('disk.status'), t('disk.type'), t('disk.size'), t('disk.used'), t('disk.free'), t('disk.temp')].map(h => (
                    <th key={h} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {caches.map((disk, i) => {
                  const ctb = cacheDiskTypeBadge(disk)
                  return (
                  <tr key={disk.id ?? i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 500 }}>{disk.name ?? '–'}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                      <span style={{ background: diskStatusColor(disk.status), color: disk.status === 'DISK_OK' ? '#000' : 'var(--text-primary)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600 }}>{disk.status ?? '–'}</span>
                    </td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                      <span style={{ color: ctb.color, fontWeight: 600, fontSize: 11 }}>{ctb.label}</span>
                    </td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>{formatKilobytes(disk.size)}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>{formatKilobytes(disk.fsUsed)}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>{formatKilobytes(disk.fsFree)}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: tempColor(disk.temp) }}>
                      {disk.temp != null ? `${disk.temp}°C` : '–'}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          )
        )}
      </div>

      <div className="glass" style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)' }}>
        <button className="btn" onClick={() => setShowHistory(v => !v)} style={{ marginBottom: showHistory ? 'var(--spacing-sm)' : 0 }}>
          {showHistory ? t('array_tab.parity_history_hide') : t('array_tab.parity_history_show')}
        </button>
        {showHistory && parityHistory.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {[t('array_tab.parity_h_date'), t('array_tab.parity_h_duration'), 'Speed', t('array_tab.parity_h_status'), t('array_tab.parity_h_errors')].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parityHistory.slice(0, 10).map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '6px 8px' }}>{p.date ?? '–'}</td>
                  <td style={{ padding: '6px 8px' }}>{p.duration ? `${Math.floor((p.duration ?? 0) / 3600)}h ${Math.floor(((p.duration ?? 0) % 3600) / 60)}m` : '–'}</td>
                  <td style={{ padding: '6px 8px' }}>{formatParitySpeed(p.speed)}</td>
                  <td style={{ padding: '6px 8px' }}>{p.status ?? '–'}</td>
                  <td style={{ padding: '6px 8px', color: (p.errors ?? 0) > 0 ? 'var(--status-offline)' : 'var(--status-online)' }}>{p.errors ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {showHistory && parityHistory.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>{t('array_tab.parity_history_empty')}</div>}
      </div>

      <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: 'var(--spacing-md)' }}>
        <button className="btn" onClick={() => setShowPhysical(v => !v)} style={{ width: '100%', textAlign: 'left', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{t('array_tab.physical_drives')} {pdisks.length > 0 ? `(${pdisks.length})` : ''}</span>
          {showPhysical ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showPhysical && (
          pdisks.length === 0 ? (
            <div style={{ padding: 'var(--spacing-md)', color: 'var(--text-muted)', fontSize: 13 }}>{t('array_tab.physical_drives_empty')}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, borderTop: '1px solid var(--border)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[t('disk.name'), t('disk.type'), t('disk.size'), t('disk.interface'), 'S/N', 'SMART', t('disk.temp'), t('disk.status')].map(h => (
                    <th key={h} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pdisks.map((d, i) => (
                  <tr key={d.id ?? i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 500 }}>{d.name ?? '–'}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                      {(() => { const dtb = diskTypeBadge(d.interfaceType, d.type); return <span style={{ color: dtb.color, fontWeight: 600, fontSize: 11 }}>{dtb.label}</span> })()}
                    </td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>{formatBytes(d.size)}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--text-muted)' }}>{d.interfaceType ?? '–'}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--text-muted)', fontSize: 11 }}>{d.serialNum ?? '–'}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                      {(() => { const s = smartStatusStyle(d.smartStatus); return <span style={{ color: s.color, fontWeight: 600, fontSize: 12 }}>{s.label}</span> })()}
                    </td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: tempColor(d.temperature) }}>{d.temperature != null ? `${d.temperature}°C` : '–'}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--text-muted)', fontSize: 11 }}>{d.isSpinning ? t('array_tab.disk_spinning') : t('array_tab.disk_standby')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {confirm && (
        <ConfirmModal
          title={t('confirm.title')}
          message={confirm.msg}
          onConfirm={() => { setConfirm(null); confirm.onConfirm ? confirm.onConfirm() : runConfirm(confirm.action) }}
          onCancel={() => setConfirm(null)}
          danger={confirm.action === 'arrayStop' || confirm.action === 'parityCancel'}
        >
          {confirm.extra}
        </ConfirmModal>
      )}
    </div>
  )
}

// ── Docker Tab ────────────────────────────────────────────────────────────────

function DockerTab({ instanceId }: { instanceId: string }) {
  const { t } = useTranslation('unraid')
  const { docker, loadDocker, dockerControl, dockerUpdateAll, removeDockerContainer, errors } = useUnraidStore()
  const { isAdmin } = useStore()
  const { toast } = useToast()
  const containers = docker[instanceId] ?? []
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'running' | 'stopped'>('all')
  const [actionLoading, setActionLoading] = useState<Record<string, string | undefined>>({})
  const [updatingAll, setUpdatingAll] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    loadDocker(instanceId)
    const t = setInterval(() => loadDocker(instanceId), 15_000)
    return () => clearInterval(t)
  }, [instanceId])

  const sorted = [...containers].sort((a, b) => {
    const nameA = (a.names?.[0] ?? '').replace(/^\//, '').toLowerCase()
    const nameB = (b.names?.[0] ?? '').replace(/^\//, '').toLowerCase()
    return nameA.localeCompare(nameB)
  })
  const filtered = sorted.filter(c => {
    const name = c.names?.[0]?.replace(/^\//, '') ?? ''
    const image = c.image?.split('@')[0] ?? ''
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || image.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || (filter === 'running' && c.state === 'RUNNING') || (filter === 'stopped' && c.state !== 'RUNNING')
    return matchSearch && matchFilter
  })

  const handleAction = async (c: UnraidContainer, action: 'start' | 'stop' | 'restart' | 'unpause' | 'pause') => {
    const name = c.names?.[0]?.replace(/^\//, '') ?? ''
    setActionLoading(s => ({ ...s, [name]: action }))
    try {
      await dockerControl(instanceId, name, action)
      toast({ message: `${name} ${action}`, type: 'success' })
    } catch (e) {
      toast({ message: (e as Error).message, type: 'error' })
    } finally {
      setActionLoading(s => ({ ...s, [name]: undefined }))
    }
  }

  const handleUpdateAll = async () => {
    setUpdatingAll(true)
    try {
      await dockerUpdateAll(instanceId)
      toast({ message: t('docker_tab.update_all_toast'), type: 'success' })
    } catch (e) {
      toast({ message: (e as Error).message, type: 'error' })
    } finally {
      setUpdatingAll(false)
    }
  }

  const err = errors[`docker_${instanceId}`]

  return (
    <div>
      {err && <div className="error-banner" style={{ marginBottom: 'var(--spacing-md)' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="Suchen…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 220 }} />
        {(['all', 'running', 'stopped'] as const).map(f => (
          <button key={f} className={`btn${filter === f ? ' btn-primary' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? t('docker_tab.filter_all') : f === 'running' ? 'Running' : 'Stopped'}
          </button>
        ))}
        {isAdmin && (
          <button className="btn" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }} disabled={updatingAll} onClick={handleUpdateAll}>
            {updatingAll ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Download size={14} />}
            {t('docker_tab.update_all')}
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
        {filtered.map((c, i) => {
          const name = c.names?.[0]?.replace(/^\//, '') ?? 'Unbekannt'
          const imageDisplay = (c.image ?? '').split('@')[0]
          const pendingAction = actionLoading[name]
          const isLoading = !!pendingAction
          const isRunning = c.state === 'RUNNING'
          const isExited = c.state === 'EXITED'
          const isPaused = c.state === 'PAUSED'
          const ports = (c.ports ?? []).filter(p => p.publicPort)
          const badge = pendingAction ? pendingBadge(pendingAction) : containerStateBadge(c.state)
          return (
            <div key={c.id ?? i} className="glass" style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{imageDisplay}</div>
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  color: badge.color, background: badge.bg,
                  borderRadius: 'var(--radius-sm)', padding: '2px 8px',
                  fontSize: 11, fontWeight: 600, flexShrink: 0,
                  animation: badge.pulse ? 'pulse 2s infinite' : 'none',
                }}>
                  {isLoading
                    ? <span className="spinner" style={{ width: 6, height: 6, flexShrink: 0 }} />
                    : <span style={{ width: 6, height: 6, borderRadius: '50%', background: badge.color, flexShrink: 0 }} />}
                  {badge.label}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{c.status ?? ''}</div>
              {ports.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                  {ports.slice(0, 4).map((p, pi) => (
                    <span key={pi} style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {p.publicPort}:{p.privatePort}/{p.type}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, alignItems: 'center' }}>
                {c.hostConfig?.networkMode && <span>{c.hostConfig.networkMode}</span>}
                {c.autoStart && <RotateCcw size={11} title="Auto Start" />}
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {actionButton('Start',   <Play size={11} />,      () => handleAction(c, 'start'),   'green',  !isExited,               isLoading)}
                {actionButton('Stop',    <Square size={11} />,    () => handleAction(c, 'stop'),    'red',    !(isRunning || isPaused), isLoading)}
                {actionButton('Restart', <RotateCcw size={11} />, () => handleAction(c, 'restart'), 'yellow', !isRunning,              isLoading)}
                {isRunning && actionButton('Pause',  <Pause size={11} />, () => handleAction(c, 'pause'),   'blue',   false, isLoading)}
                {isPaused  && actionButton('Resume', <Play size={11} />,  () => handleAction(c, 'unpause'), 'yellow', false, isLoading)}
                {isAdmin && c.id && actionButton('', <Trash2 size={11} />, () => setConfirmRemove({ id: c.id!, name }), 'red', isLoading, isLoading)}
              </div>
            </div>
          )
        })}
      </div>
      {filtered.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-2xl)' }}>{t('docker.empty')}</div>}
      {confirmRemove && (
        <ConfirmModal
          title={t('docker.delete_title')}
          message={t('docker.delete_msg', { name: confirmRemove.name })}
          onConfirm={async () => {
            const { id, name: n } = confirmRemove
            setConfirmRemove(null)
            try {
              await removeDockerContainer(instanceId, id)
              toast({ message: t('docker.deleted', { name: n }), type: 'success' })
            } catch (e) {
              toast({ message: (e as Error).message, type: 'error' })
            }
          }}
          onCancel={() => setConfirmRemove(null)}
          danger
        />
      )}
    </div>
  )
}

// ── VMs Tab ───────────────────────────────────────────────────────────────────

function VmsTab({ instanceId }: { instanceId: string }) {
  const { t } = useTranslation('unraid')
  const { vms, loadVms, vmControl, errors } = useUnraidStore()
  const { toast } = useToast()
  const domains = [...(vms[instanceId] ?? [])].sort((a, b) => (a.name ?? '').toLowerCase().localeCompare((b.name ?? '').toLowerCase()))
  const [vmLoading, setVmLoading] = useState<Record<string, string | undefined>>({})
  const [confirm, setConfirm] = useState<{ vm: UnraidVm; action: 'stop' | 'pause' | 'forcestop' | 'reset' } | null>(null)

  useEffect(() => {
    loadVms(instanceId)
    const t = setInterval(() => loadVms(instanceId), 30_000)
    return () => clearInterval(t)
  }, [instanceId])

  const handleVmAction = async (vm: UnraidVm, action: 'start' | 'stop' | 'pause' | 'resume' | 'forcestop' | 'reboot' | 'reset') => {
    const vmId = vm.id ?? ''
    setVmLoading(s => ({ ...s, [vmId]: action }))
    try {
      await vmControl(instanceId, vmId, action)
      toast({ message: `VM ${vm.name} ${action}`, type: 'success' })
    } catch (e) {
      toast({ message: (e as Error).message, type: 'error' })
    } finally {
      setVmLoading(s => ({ ...s, [vmId]: undefined }))
    }
  }

  const err = errors[`vms_${instanceId}`]

  if (!err && domains.length === 0) {
    return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--spacing-2xl)' }}>{t('vms_tab.empty')}</div>
  }

  return (
    <div>
      {err && <div className="error-banner" style={{ marginBottom: 'var(--spacing-md)' }}>{err}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--spacing-md)' }}>
        {domains.map((vm, i) => {
          const vmId = vm.id ?? String(i)
          const vmPendingAction = vmLoading[vmId]
          const isLoading = !!vmPendingAction
          const isCrashed = vm.state === 'CRASHED'
          const isShutoff = vm.state === 'SHUTOFF' || vm.state === 'SHUTDOWN' || vm.state === 'NOSTATE'
          const isRunning = vm.state === 'RUNNING' || vm.state === 'IDLE'
          const isPaused = vm.state === 'PAUSED'
          const canStart = isShutoff || isCrashed
          const canStop = isRunning || isPaused
          const vmbadge = vmPendingAction ? pendingBadge(vmPendingAction) : vmStateBadge(vm.state)
          return (
            <div key={vmId} className="glass" style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>{vm.name ?? '–'}</h3>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  color: vmbadge.color, background: vmbadge.bg,
                  borderRadius: 'var(--radius-sm)', padding: '2px 8px',
                  fontSize: 11, fontWeight: 600, flexShrink: 0,
                  animation: vmbadge.pulse ? 'pulse 2s infinite' : 'none',
                }}>
                  {isLoading
                    ? <span className="spinner" style={{ width: 6, height: 6, flexShrink: 0 }} />
                    : <span style={{ width: 6, height: 6, borderRadius: '50%', background: vmbadge.color, flexShrink: 0 }} />}
                  {vmbadge.label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                {canStart                 && actionButton('Start',   <Play size={11} />,        () => handleVmAction(vm, 'start'),                'green',  false, isLoading)}
                {canStop                  && actionButton('Stop',    <Square size={11} />,      () => setConfirm({ vm, action: 'stop' }),         'red',    false, isLoading)}
                {(isRunning || isCrashed) && actionButton('',        <Zap size={11} />,         () => setConfirm({ vm, action: 'forcestop' }),    'red',    false, isLoading)}
                {isRunning                && actionButton('Pause',   <Pause size={11} />,       () => setConfirm({ vm, action: 'pause' }),        'blue',   false, isLoading)}
                {isRunning                && actionButton('Restart', <RotateCcw size={11} />,   () => handleVmAction(vm, 'reboot'),               'yellow', false, isLoading)}
                {(isRunning || isCrashed) && actionButton('Reset',  <SkipForward size={11} />, () => setConfirm({ vm, action: 'reset' }),        'red',    false, isLoading)}
                {isPaused                 && actionButton('Resume',  <Play size={11} />,        () => handleVmAction(vm, 'resume'),               'yellow', false, isLoading)}
              </div>
            </div>
          )
        })}
      </div>
      {confirm && (
        <ConfirmModal
          title={t('confirm.ok')}
          message={confirm.action === 'forcestop' ? t('vm.confirm_forcestop') : confirm.action === 'reset' ? t('vm.confirm_reset') : t('vm.confirm_shutdown')}
          onConfirm={() => { handleVmAction(confirm.vm, confirm.action); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
          danger
        />
      )}
    </div>
  )
}

// ── Shares Tab ────────────────────────────────────────────────────────────────

function SharesTab({ instanceId }: { instanceId: string }) {
  const { t } = useTranslation('unraid')
  const { shares, loadShares, errors } = useUnraidStore()
  const shareList = shares[instanceId] ?? []
  const err = errors[`shares_${instanceId}`]

  useEffect(() => { loadShares(instanceId) }, [instanceId])

  return (
    <div>
      {err && <div className="error-banner" style={{ marginBottom: 'var(--spacing-md)' }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-sm)' }}>
        <button className="btn" onClick={() => loadShares(instanceId)}><RefreshCw size={14} /></button>
      </div>
      <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Kommentar', 'LUKS', 'Belegt / Gesamt', 'Frei', 'Cache'].map(h => (
                <th key={h} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shareList.map((s, i) => (
              <tr key={s.name ?? i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 500 }}>{s.name ?? '–'}</td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--text-muted)' }}>{s.comment ?? '–'}</td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                  {s.luksStatus ? <span style={{ background: '#f59e0b', color: '#000', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600 }}>LUKS</span> : null}
                </td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                  {(() => {
                    const total = s.size || ((s.used ?? 0) + (s.free ?? 0))
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {total > 0 ? (
                          <div style={{ background: 'var(--glass-bg)', borderRadius: 2, height: 6, width: 80 }}>
                            <div style={{ background: 'var(--accent)', height: '100%', borderRadius: 2, width: `${((s.used ?? 0) / (total || 1) * 100).toFixed(0)}%` }} />
                          </div>
                        ) : null}
                        <span>{formatKilobytes(s.used)} / {formatKilobytes(total || undefined)}</span>
                      </div>
                    )
                  })()}
                </td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>{formatKilobytes(s.free)}</td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                  {(() => {
                    const cv = s.cache
                    const active = cv && cv !== 'no'
                    const label = !cv || cv === 'no' ? 'Nein' : cv === 'yes' ? 'Ja' : cv === 'prefer' ? 'Prefer' : cv === 'only' ? 'Nur' : cv
                    return <span style={{ background: active ? '#3b82f6' : 'var(--glass-bg)', color: active ? '#fff' : 'var(--text-muted)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600 }}>{label}</span>
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shareList.length === 0 && <div style={{ padding: 'var(--spacing-xl)', color: 'var(--text-muted)', textAlign: 'center' }}>{t('shares_tab.empty')}</div>}
      </div>
    </div>
  )
}

// ── Notifications Tab ─────────────────────────────────────────────────────────

function NotificationsTab({ instanceId }: { instanceId: string }) {
  const { t } = useTranslation('unraid')
  const { notifications, loadNotifications, loadNotificationsArchive, archiveNotification, archiveAllNotifications, deleteNotificationPerm, errors } = useUnraidStore()
  const { isAdmin } = useStore()
  const { toast } = useToast()
  const data = notifications[instanceId]
  const [view, setView] = useState<'unread' | 'archive'>('unread')
  const unreadObj = data?.notifications?.overview?.unread
  const unread = unreadObj?.total ?? ((unreadObj?.info ?? 0) + (unreadObj?.warning ?? 0) + (unreadObj?.alert ?? 0))
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [archivingAll, setArchivingAll] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<UnraidNotification | null>(null)
  const [localList, setLocalList] = useState<UnraidNotification[]>([])
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: string } | null>(null)
  const err = errors[`notif_${instanceId}`]

  useEffect(() => {
    loadNotifications(instanceId)
    const t = setInterval(() => loadNotifications(instanceId), 60_000)
    return () => clearInterval(t)
  }, [instanceId])

  useEffect(() => {
    if (view === 'archive') loadNotificationsArchive(instanceId)
  }, [view, instanceId])

  useEffect(() => {
    setLocalList(data?.notifications?.list ?? [])
  }, [data])

  const importanceColor = (imp?: string) => {
    if (imp === 'ALERT') return 'var(--status-offline)'
    if (imp === 'WARNING') return 'var(--warning)'
    if (imp === 'INFO') return 'var(--accent)'
    return 'var(--border)'
  }

  const handleArchive = async (notifId: string) => {
    setLocalList(prev => prev.filter(n => n.id !== notifId))
    try {
      await archiveNotification(instanceId, notifId)
    } catch {
      toast({ message: 'Fehler beim Archivieren', type: 'error' })
      setLocalList(data?.notifications?.list ?? [])
    }
  }

  const handleArchiveAll = async () => {
    setLocalList([])
    setArchivingAll(true)
    try {
      await archiveAllNotifications(instanceId)
    } catch {
      toast({ message: 'Fehler beim Archivieren aller Benachrichtigungen', type: 'error' })
      setLocalList(data?.notifications?.list ?? [])
    } finally {
      setArchivingAll(false)
    }
  }

  const archiveList = data?.notifications?.archive ?? []
  const displayList = view === 'archive' ? archiveList : localList

  const renderList = (items: typeof displayList, showArchive: boolean) => (
    items.length === 0 ? (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--text-muted)' }}>
        <Check size={20} color="var(--status-online)" style={{ marginBottom: 8 }} />
        <div>{view === 'archive' ? t('notifications.no_archive') : t('notifications.no_unread')}</div>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {items.map((n, i) => {
          const isLong = (n.description?.length ?? 0) > 120
          const isExpanded = expanded[n.id ?? String(i)]
          return (
            <div key={n.id ?? i} className="glass" style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${importanceColor(n.importance)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{n.title ?? '–'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{n.subject ?? ''}</div>
                  {n.description && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {isLong && !isExpanded ? n.description.slice(0, 120) + '…' : n.description}
                      {isLong && (
                        <button className="btn" onClick={() => setExpanded(s => ({ ...s, [n.id ?? String(i)]: !s[n.id ?? String(i)] }))} style={{ marginLeft: 6, padding: '0 4px', fontSize: 11 }}>
                          {isExpanded ? 'weniger' : 'mehr anzeigen'}
                        </button>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{n.formattedTimestamp ?? formatRelative(n.timestamp)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  {n.link && (
                    <button className="btn" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => setSelectedNotification(n)}>
                      Details
                    </button>
                  )}
                  {showArchive && n.id && (
                    <button className="btn" onClick={() => handleArchive(n.id!)} style={{ padding: '2px 8px', fontSize: 12 }}>
                      Als gelesen markieren
                    </button>
                  )}
                  {isAdmin && n.id && (
                    <button className="btn btn-danger" onClick={() => setConfirmDelete({ id: n.id!, type: view === 'archive' ? 'ARCHIVE' : 'UNREAD' })} style={{ padding: '2px 8px', fontSize: 12 }}>
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  )

  return (
    <div>
      {err && <div className="error-banner" style={{ marginBottom: 'var(--spacing-md)' }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className={`btn${view === 'unread' ? ' btn-primary' : ''}`} onClick={() => setView('unread')} style={{ fontSize: 13 }}>
            {t('notif.unread')} {unread > 0 && <span style={{ color: 'var(--warning)', background: 'rgba(234,179,8,0.12)', borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700, marginLeft: 4 }}>{unread}</span>}
          </button>
          <button className={`btn${view === 'archive' ? ' btn-primary' : ''}`} onClick={() => setView('archive')} style={{ fontSize: 13 }}>{t('notif.archive')}</button>
        </div>
        {view === 'unread' && localList.length > 0 && (
          <button className="btn btn-primary" disabled={archivingAll} onClick={handleArchiveAll}>
            {archivingAll ? <><div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> {t('notif.archiving')}</> : t('notif.mark_all_read')}
          </button>
        )}
      </div>
      {renderList(displayList, view === 'unread')}

      {selectedNotification && (
        <div className="modal-overlay" onClick={() => setSelectedNotification(null)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: '100%' }}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  display: 'inline-block', width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: selectedNotification.importance === 'ALERT'
                    ? 'var(--status-offline)'
                    : selectedNotification.importance === 'WARNING'
                      ? 'var(--warning)'
                      : 'var(--accent)',
                }} />
                <h3 className="modal-title" style={{ margin: 0 }}>{selectedNotification.title}</h3>
              </div>
              <button className="btn" style={{ flexShrink: 0 }} onClick={() => setSelectedNotification(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedNotification.subject && (
                <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedNotification.subject}</p>
              )}
              {selectedNotification.description && (
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedNotification.description}
                </p>
              )}
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                {selectedNotification.formattedTimestamp ?? formatRelative(selectedNotification.timestamp)}
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setSelectedNotification(null)}>{t('notif.close')}</button>
              {selectedNotification.id && (
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    await handleArchive(selectedNotification.id!)
                    setSelectedNotification(null)
                  }}
                >
                  {t('notif.mark_read')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {confirmDelete && (
        <ConfirmModal
          title={t('notif.delete_title')}
          message={t('notif.delete_msg')}
          onConfirm={async () => {
            const { id, type } = confirmDelete
            setConfirmDelete(null)
            try {
              await deleteNotificationPerm(instanceId, id, type)
              toast({ message: t('notif.deleted'), type: 'success' })
            } catch (e) {
              toast({ message: (e as Error).message, type: 'error' })
            }
          }}
          onCancel={() => setConfirmDelete(null)}
          danger
        />
      )}
    </div>
  )
}

// ── System Tab ────────────────────────────────────────────────────────────────

function SystemTab({ instanceId }: { instanceId: string }) {
  const { t } = useTranslation('unraid')
  const { info, config, users, loadInfo, loadConfig, loadUsers, errors } = useUnraidStore()
  const data = info[instanceId]
  const cfgData = config[instanceId]
  const userList = users[instanceId] ?? []

  useEffect(() => {
    loadInfo(instanceId)
    loadConfig(instanceId)
    loadUsers(instanceId)
  }, [instanceId])

  const reload = () => { loadInfo(instanceId); loadConfig(instanceId); loadUsers(instanceId) }

  const os = data?.info?.os
  const cpu = data?.info?.cpu
  const memory = data?.metrics?.memory
  const baseboard = data?.info?.baseboard
  const sysInfo = data?.info?.system
  const versions = data?.info?.versions
  const memLayout = data?.info?.memory?.layout ?? []
  const cfg = cfgData?.config
  const err = errors[`info_${instanceId}`] ?? errors[`config_${instanceId}`]

  const roleColor = (r?: string) => r === 'admin' ? 'var(--status-offline)' : r === 'user' ? '#3b82f6' : 'var(--text-muted)'

  return (
    <div>
      {err && <div className="error-banner" style={{ marginBottom: 'var(--spacing-md)' }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-sm)' }}>
        <button className="btn" onClick={reload}><RefreshCw size={14} /></button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>

        {versions?.core?.unraid && (
          <div className="glass" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>Unraid {versions.core.unraid}</span>
              {sysInfo?.virtual && <span style={{ background: '#8b5cf6', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{t('system_tab.virtualized')}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {versions.core.api    && <InfoRow icon={<Network size={14} />}  label="API"    value={versions.core.api} />}
              {versions.core.kernel && <InfoRow icon={<Zap size={14} />}      label="Kernel" value={versions.core.kernel} />}
              {versions.packages?.docker && <InfoRow icon={<Package size={14} />} label="Docker" value={versions.packages.docker} />}
            </div>
          </div>
        )}

        <div className="glass" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>{t('system_tab.hardware')}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <InfoRow icon={<Server size={14} />}    label="Hersteller"       value={`${sysInfo?.manufacturer ?? ''} ${sysInfo?.model ?? ''}`.trim() || '–'} />
            <InfoRow icon={<Globe size={14} />}     label="Plattform"        value={os?.platform} />
            <InfoRow icon={<Monitor size={14} />}   label="Betriebssystem"   value={`${os?.distro ?? ''} ${os?.release ?? ''}`.trim() || '–'} />
            <InfoRow icon={<Clock size={14} />}     label="Uptime"           value={formatUptime(os?.uptime)} />
            <InfoRow icon={<Cpu size={14} />}       label="CPU"              value={`${cpu?.manufacturer ?? ''} ${cpu?.brand ?? ''}`.trim() || '–'} />
            <InfoRow icon={<Layers size={14} />}    label="Kerne / Threads"  value={`${cpu?.cores ?? '–'} / ${cpu?.threads ?? '–'}`} />
            <InfoRow icon={<Activity size={14} />}  label="RAM gesamt"       value={memory?.total != null ? formatBytes(memory.total) : '–'} />
            <InfoRow icon={<HardDrive size={14} />} label="Mainboard"        value={`${baseboard?.manufacturer ?? ''} ${baseboard?.model ?? ''}`.trim() || '–'} />
          </div>
        </div>

        {memLayout.length > 0 && (
          <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ padding: 'var(--spacing-md)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>RAM-Module ({memLayout.length})</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Slot', t('disk.size'), t('disk.type'), 'Speed', t('system.manufacturer'), 'Part-Nr.'].map(h => (
                    <th key={h} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {memLayout.map((slot, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 500 }}>{slot.size ? formatBytes(slot.size) : '–'}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>{slot.type ?? '–'}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{slot.clockSpeed ? `${slot.clockSpeed} MHz` : '–'}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--text-muted)' }}>{slot.manufacturer ?? '–'}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{slot.partNum ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {cfg && (
          <div className="glass" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>{t('system.license')}</div>
            {cfg.error && <div className="error-banner" style={{ marginBottom: 8 }}>{cfg.error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <InfoRow icon={<Key size={14} />}    label={t('system.registered_for')} value={cfg.registrationTo} />
              <InfoRow icon={<Tag size={14} />}    label={t('system.license_type')}    value={cfg.registrationType} />
              <InfoRow icon={<Shield size={14} />} label={t('system.lic_status')}       value={
                cfg.valid
                  ? <span style={{ color: 'var(--status-online)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={12} /> {t('system.lic_valid')}</span>
                  : <span style={{ color: 'var(--status-offline)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} /> {t('system.lic_invalid')}</span>
              } />
            </div>
          </div>
        )}

        {userList.length > 0 && (
          <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{ padding: 'var(--spacing-md)', fontWeight: 600, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} /> {t('system_tab.users')}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Beschreibung', 'Rolle'].map(h => (
                    <th key={h} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userList.map((u, i) => (
                  <tr key={u.name ?? i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 500 }}>{u.name ?? '–'}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--text-muted)' }}>{u.description ?? '–'}</td>
                    <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                      <span style={{ background: roleColor(u.role), color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600 }}>{u.role ?? '–'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── UPS Tab ───────────────────────────────────────────────────────────────────

function UpsTab({ instanceId }: { instanceId: string }) {
  const { t } = useTranslation('unraid')
  const { upsDevices, upsConfig, loadUpsDevices, loadUpsConfig, errors } = useUnraidStore()
  const devices = upsDevices[instanceId] ?? []
  const cfg = upsConfig[instanceId]
  const err = errors[`ups_${instanceId}`]

  useEffect(() => {
    loadUpsDevices(instanceId)
    loadUpsConfig(instanceId)
    const t = setInterval(() => loadUpsDevices(instanceId), 30_000)
    return () => clearInterval(t)
  }, [instanceId])

  const statusColor = (s?: string) => {
    if (!s) return 'var(--text-muted)'
    if (s === 'OL' || s.includes('OL')) return 'var(--status-online)'
    if (s.includes('OB') || s.includes('LB')) return 'var(--status-offline)'
    return 'var(--warning)'
  }

  return (
    <div>
      {err && <div className="error-banner" style={{ marginBottom: 'var(--spacing-md)' }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-sm)' }}>
        <button className="btn" onClick={() => { loadUpsDevices(instanceId); loadUpsConfig(instanceId) }}><RefreshCw size={14} /></button>
      </div>
      {devices.length === 0 && !err ? (
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
          <AlertTriangle size={32} style={{ marginBottom: 'var(--spacing-sm)', opacity: 0.4 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('ups_tab.no_ups')}</div>
          <div style={{ fontSize: 12 }}>{t('ups_tab.no_ups_detail')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {devices.map((d, i) => {
            const charge = d.battery?.chargeLevel ?? 0
            const chargeColor = charge > 50 ? 'var(--status-online)' : charge > 20 ? 'var(--warning)' : 'var(--status-offline)'
            return (
              <div key={d.id ?? i} className="glass" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{d.name ?? '–'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.model ?? ''}</div>
                  </div>
                  {d.status && (
                    <span style={{ background: 'var(--glass-bg)', color: statusColor(d.status), borderRadius: 'var(--radius-sm)', padding: '2px 10px', fontSize: 12, fontWeight: 600, border: `1px solid ${statusColor(d.status)}` }}>
                      {d.status}
                    </span>
                  )}
                </div>
                {d.battery && (
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Akku</span>
                      <span style={{ color: chargeColor, fontWeight: 600 }}>{charge}%</span>
                    </div>
                    <div style={{ background: 'var(--glass-bg)', borderRadius: 4, height: 8 }}>
                      <div style={{ background: chargeColor, height: '100%', borderRadius: 4, width: `${charge}%`, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-lg)', marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      {d.battery.estimatedRuntime != null && <span>{t('ups_tab.runtime')} <strong style={{ color: 'var(--text-primary)' }}>{d.battery.estimatedRuntime} Min</strong></span>}
                      {d.battery.health && <span>{t('ups_tab.health')} <strong style={{ color: 'var(--text-primary)' }}>{d.battery.health}</strong></span>}
                    </div>
                  </div>
                )}
                {d.power && (
                  <div style={{ display: 'flex', gap: 'var(--spacing-lg)', fontSize: 12, color: 'var(--text-muted)' }}>
                    {d.power.inputVoltage != null && <span>{t('ups_tab.input_voltage')} <strong style={{ color: 'var(--text-primary)' }}>{d.power.inputVoltage} V</strong></span>}
                    {d.power.outputVoltage != null && <span>{t('ups_tab.output_voltage')} <strong style={{ color: 'var(--text-primary)' }}>{d.power.outputVoltage} V</strong></span>}
                    {d.power.loadPercentage != null && <span>Last: <strong style={{ color: 'var(--text-primary)' }}>{d.power.loadPercentage}%</strong></span>}
                  </div>
                )}
              </div>
            )
          })}
          {cfg && (
            <div className="glass" style={{ padding: 'var(--spacing-lg)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>{t('ups_tab.config')}</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {cfg.upsName     && <InfoRow icon={<Zap size={14} />}     label="UPS Name"   value={cfg.upsName} />}
                {cfg.modelName   && <InfoRow icon={<Package size={14} />} label="Modell"      value={cfg.modelName} />}
                {cfg.service     && <InfoRow icon={<Activity size={14} />} label="Service"    value={cfg.service} />}
                {cfg.upsType     && <InfoRow icon={<Settings2 size={14} />} label="Typ"       value={cfg.upsType} />}
                {cfg.device      && <InfoRow icon={<HardDrive size={14} />} label={t('ups.device')}     value={cfg.device} />}
                {cfg.batteryLevel != null && <InfoRow icon={<Zap size={14} />} label="Akku-Schwelle" value={`${cfg.batteryLevel}%`} />}
                {cfg.minutes     != null  && <InfoRow icon={<Clock size={14} />} label="Minuten"   value={`${cfg.minutes} Min`} />}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Logs Tab ──────────────────────────────────────────────────────────────────

function LogsTab({ instanceId }: { instanceId: string }) {
  const { t } = useTranslation('unraid')
  const { logs, loadLogs, errors } = useUnraidStore()
  const { toast } = useToast()
  const logFiles = logs[instanceId] ?? []
  const err = errors[`logs_${instanceId}`]
  const [viewLog, setViewLog] = useState<{ name: string; path: string } | null>(null)
  const [logContent, setLogContent] = useState<string | null>(null)
  const [logLoading, setLogLoading] = useState(false)

  useEffect(() => { loadLogs(instanceId) }, [instanceId])

  const handleView = async (path: string, name: string) => {
    setViewLog({ name, path })
    setLogContent(null)
    setLogLoading(true)
    try {
      const data = await api.unraid.logFile(instanceId, path, 200)
      setLogContent(data.logFile?.content ?? '')
    } catch (e) {
      toast({ message: (e as Error).message, type: 'error' })
      setViewLog(null)
    } finally {
      setLogLoading(false)
    }
  }

  return (
    <div>
      {err && <div className="error-banner" style={{ marginBottom: 'var(--spacing-md)' }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-sm)' }}>
        <button className="btn" onClick={() => loadLogs(instanceId)}><RefreshCw size={14} /></button>
      </div>
      <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {[t('disk.name'), t('disk.size'), t('logs.modified'), ''].map(h => (
                <th key={h} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logFiles.map((f, i) => (
              <tr key={f.path ?? i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{f.name ?? '–'}</td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--text-muted)' }}>{f.size != null ? formatBytes(f.size) : '–'}</td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--text-muted)' }}>{f.modifiedAt ? formatRelative(f.modifiedAt) : '–'}</td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                  {f.path && (
                    <button className="btn btn-primary" style={{ fontSize: 12, padding: '2px 10px' }} onClick={() => handleView(f.path!, f.name ?? f.path!)}>
                      {t('logs.view')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logFiles.length === 0 && <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>{t('empty_entries')}</div>}
      </div>

      {viewLog && (
        <div className="modal-overlay" onClick={() => setViewLog(null)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{viewLog.name}</h3>
              <button className="btn" onClick={() => setViewLog(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
              {logLoading
                ? <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}><span className="spinner" style={{ width: 20, height: 20 }} /></div>
                : <pre style={{ margin: 0, padding: 'var(--spacing-md)', fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>{logContent ?? ''}</pre>
              }
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setViewLog(null)}>{t('confirm.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Plugins Tab ───────────────────────────────────────────────────────────────

function PluginsTab({ instanceId }: { instanceId: string }) {
  const { t } = useTranslation('unraid')
  const { plugins, loadPlugins, removePlugin, errors } = useUnraidStore()
  const { isAdmin } = useStore()
  const { toast } = useToast()
  const pluginList = plugins[instanceId] ?? []
  const err = errors[`plugins_${instanceId}`]
  const [confirmRemove, setConfirmRemove] = useState<string[] | null>(null)

  useEffect(() => { loadPlugins(instanceId) }, [instanceId])

  const handleRemove = async (names: string[]) => {
    try {
      await removePlugin(instanceId, names)
      toast({ message: `Plugin(s) entfernt`, type: 'success' })
    } catch (e) {
      toast({ message: (e as Error).message, type: 'error' })
    }
  }

  return (
    <div>
      {err && <div className="error-banner" style={{ marginBottom: 'var(--spacing-md)' }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-sm)' }}>
        <button className="btn" onClick={() => loadPlugins(instanceId)}><RefreshCw size={14} /></button>
      </div>
      <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Version', 'API', 'CLI', isAdmin ? 'Aktion' : ''].map(h => (
                <th key={h} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pluginList.map((p, i) => (
              <tr key={p.name ?? i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 500 }}>{p.name ?? '–'}</td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{p.version ?? '–'}</td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                  {p.hasApiModule ? <Check size={14} color="var(--status-online)" /> : <span style={{ color: 'var(--text-muted)' }}>–</span>}
                </td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                  {p.hasCliModule ? <Check size={14} color="var(--status-online)" /> : <span style={{ color: 'var(--text-muted)' }}>–</span>}
                </td>
                {isAdmin && (
                  <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                    <button className="btn btn-danger" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => setConfirmRemove([p.name!])}>
                      <Trash2 size={11} /> {t('apikey_tab.remove')}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {pluginList.length === 0 && !err && (
          <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Package size={48} style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
            <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>{t('system_tab.no_plugins')}</div>
            <div style={{ fontSize: 13, maxWidth: 400, margin: '0 auto' }}>
              Diese Liste zeigt nur Plugins die API-Module bereitstellen. Standard Community Apps Plugins erscheinen hier nicht.
            </div>
          </div>
        )}
      </div>
      {confirmRemove && (
        <ConfirmModal
          title="Plugin entfernen"
          message={`Plugin "${confirmRemove.join(', ')}" entfernen?`}
          onConfirm={() => { handleRemove(confirmRemove); setConfirmRemove(null) }}
          onCancel={() => setConfirmRemove(null)}
          danger
        />
      )}
    </div>
  )
}

// ── API Keys Tab ──────────────────────────────────────────────────────────────

function ApiKeysTab({ instanceId }: { instanceId: string }) {
  const { t } = useTranslation('unraid')
  const { apiKeys, loadApiKeys, createApiKey, deleteApiKey, errors } = useUnraidStore()
  const { isAdmin } = useStore()
  const { toast } = useToast()
  const data = apiKeys[instanceId]
  const keyList = data?.apiKeys ?? []
  const possibleRoles = data?.apiKeyPossibleRoles ?? []
  const err = errors[`apikeys_${instanceId}`]
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newRoles, setNewRoles] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => { loadApiKeys(instanceId) }, [instanceId])

  const handleCreate = async () => {
    setCreating(true)
    try {
      await createApiKey(instanceId, { name: newName, description: newDesc || undefined, roles: newRoles.length ? newRoles : undefined })
      setShowCreate(false); setNewName(''); setNewDesc(''); setNewRoles([])
      toast({ message: t('apikey.created'), type: 'success' })
    } catch (e) {
      toast({ message: (e as Error).message, type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteApiKey(instanceId, id)
      toast({ message: t('apikey.deleted'), type: 'success' })
    } catch (e) {
      toast({ message: (e as Error).message, type: 'error' })
    }
  }

  if (!isAdmin) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t('admin_only')}</div>
  }

  return (
    <div>
      {err && <div className="error-banner" style={{ marginBottom: 'var(--spacing-md)' }}>{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <button className="btn" onClick={() => loadApiKeys(instanceId)}><RefreshCw size={14} /></button>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={14} /> {t('apikey.new')}
        </button>
      </div>
      <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Name', 'Beschreibung', 'Rollen', 'Erstellt', ''].map(h => (
                <th key={h} style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keyList.map((k, i) => (
              <tr key={k.id ?? i} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 500 }}>{k.name ?? '–'}</td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--text-muted)' }}>{k.description ?? '–'}</td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(k.roles ?? []).map(r => (
                      <span key={r} style={{ background: 'var(--glass-bg)', color: 'var(--accent)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600 }}>{r}</span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--text-muted)', fontSize: 12 }}>
                  {k.createdAt ? formatRelative(k.createdAt) : '–'}
                </td>
                <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                  {k.id && (
                    <button className="btn btn-danger" style={{ fontSize: 12, padding: '2px 8px' }} onClick={() => setConfirmDelete({ id: k.id!, name: k.name ?? k.id! })}>
                      <Trash2 size={11} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {keyList.length === 0 && <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>{t('empty_entries')}</div>}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content glass" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '100%' }}>
            <div className="modal-header">
              <h3 className="modal-title">{t('apikey.new')}</h3>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <input className="input" placeholder="Name *" value={newName} onChange={e => setNewName(e.target.value)} />
              <input className="input" placeholder="Beschreibung" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              {possibleRoles.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{t('apikey_tab.roles')}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {possibleRoles.map(r => (
                      <button key={r} className={`btn${newRoles.includes(r) ? ' btn-primary' : ''}`} style={{ fontSize: 12, padding: '2px 10px' }} onClick={() => setNewRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowCreate(false)}>{t('apikey_tab.cancel')}</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={!newName || creating}>
                {creating ? <span className="spinner" style={{ width: 14, height: 14 }} /> : t('apikey.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title={t('apikey.delete_title')}
          message={t('apikey.delete_msg', { name: confirmDelete.name })}
          onConfirm={() => { handleDelete(confirmDelete.id); setConfirmDelete(null) }}
          onCancel={() => setConfirmDelete(null)}
          danger
        />
      )}
    </div>
  )
}

// ── SortableInstanceCard ──────────────────────────────────────────────────────

function SortableInstanceCard({ instance, onUpdate, onDelete }: {
  instance: UnraidInstance
  onUpdate: (id: string, data: object) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const { t } = useTranslation('unraid')
  const { online } = useUnraidStore()
  const { toast } = useToast()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: instance.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(instance.name)
  const [editUrl, setEditUrl] = useState(instance.url)
  const [editKey, setEditKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [pingResult, setPingResult] = useState<boolean | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pinging, setPinging] = useState(false)
  const [saving, setSaving] = useState(false)

  const handlePing = async () => {
    setPinging(true)
    setPingResult(null)
    try {
      const res = await api.unraid.ping(instance.id)
      setPingResult(res.online)
    } catch {
      setPingResult(false)
    } finally {
      setPinging(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = { name: editName, url: editUrl }
      if (editKey) body.api_key = editKey
      await onUpdate(instance.id, body)
      setEditing(false)
      toast({ message: t('instance.updated'), type: 'success' })
    } catch (e) {
      toast({ message: (e as Error).message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const isOnline = online[instance.id]

  return (
    <div ref={setNodeRef} style={{ ...style, padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)' }} className="glass">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: editing ? 'var(--spacing-md)' : 0 }}>
          <GripVertical size={14} {...listeners} {...attributes} style={{ cursor: 'grab', color: 'var(--text-muted)', flexShrink: 0 }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? 'var(--status-online)' : 'var(--text-muted)', animation: isOnline ? 'pulse 2s infinite' : 'none', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{instance.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{instance.url}</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn" onClick={handlePing} disabled={pinging} style={{ padding: '3px 8px', fontSize: 12 }}>
              {pinging ? <span className="spinner" style={{ width: 12, height: 12 }} /> : t('instance.test')}
              {pingResult === true && !pinging && <span style={{ color: 'var(--status-online)', marginLeft: 4 }}>✓</span>}
              {pingResult === false && !pinging && <span style={{ color: 'var(--status-offline)', marginLeft: 4 }}>✗</span>}
            </button>
            <button className="btn" onClick={() => {
              if (editing) { setEditing(false) } else {
                setEditName(instance.name)
                setEditUrl(instance.url)
                setEditKey('')
                setEditing(true)
              }
            }} style={{ padding: '3px 8px', fontSize: 12 }}>
              {editing ? t('instance.cancel') : t('instance.edit')}
            </button>
            <button
              className="btn"
              onClick={() => onUpdate(instance.id, { enabled: !instance.enabled }).then(() => toast({ message: instance.enabled ? t('instance.disabled') : t('instance.enabled_msg'), type: 'success' })).catch(e => toast({ message: (e as Error).message, type: 'error' }))}
              style={{ padding: '3px 8px', fontSize: 12, opacity: instance.enabled ? 1 : 0.5 }}
            >
              {instance.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)} style={{ padding: '3px 8px', fontSize: 12 }}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {editing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <input className="input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" />
            <input className="input" value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="URL" />
            <div style={{ position: 'relative' }}>
              <input className="input" type={showKey ? 'text' : 'password'} value={editKey} onChange={e => setEditKey(e.target.value)} placeholder={t('instance.api_key_placeholder')} style={{ paddingRight: 40 }} />
              <button className="btn" onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '2px 6px', minHeight: 'unset' }}>
                {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setEditing(false)}>{t('instance.cancel')}</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : t('instance.save')}
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title={t('instance.delete_title')}
          message={t('instance.delete_msg')}
          onConfirm={() => { onDelete(instance.id).then(() => toast({ message: t('instance.deleted'), type: 'success' })).catch(e => toast({ message: (e as Error).message, type: 'error' })); setConfirmDelete(false) }}
          onCancel={() => setConfirmDelete(false)}
          danger
        />
      )}
    </div>
  )
}

// ── Management Tab ────────────────────────────────────────────────────────────

function ManagementTab() {
  const { t } = useTranslation('unraid')
  const { instances, reorderInstances, updateInstance, deleteInstance } = useUnraidStore()
  const { isAdmin } = useStore()
  const { toast } = useToast()

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = instances.findIndex(i => i.id === active.id)
    const newIdx = instances.findIndex(i => i.id === over.id)
    const reordered = arrayMove(instances, oldIdx, newIdx)
    reorderInstances(reordered.map(i => i.id)).catch(e => toast({ message: (e as Error).message, type: 'error' }))
  }

  if (!isAdmin) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t('admin_only')}</div>
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={instances.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
            {instances.map(inst => (
              <SortableInstanceCard key={inst.id} instance={inst} onUpdate={updateInstance} onDelete={deleteInstance} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const CONTENT_TAB_KEYS = ['overview', 'array', 'docker', 'vms', 'shares', 'notifications', 'system', 'ups', 'logs', 'plugins', 'apikeys'] as const

export function UnraidPage({ onNavigate }: { onNavigate?: (page: string) => void } = {}) {
  const { t } = useTranslation('unraid')
  const { instances, selectedId, online, loadInstances, setSelected, pingAll } = useUnraidStore()
  const [instTab, setInstTab] = useState<string>('') // selected instance id or 'management'
  const [contentTab, setContentTab] = useState('overview')

  useEffect(() => {
    loadInstances()
  }, [])

  // Sync instTab with selectedId
  useEffect(() => {
    if (selectedId && instTab === '') setInstTab(selectedId)
  }, [selectedId])

  useEffect(() => {
    pingAll()
    const t = setInterval(() => pingAll(), 30_000)
    return () => clearInterval(t)
  }, [instances.length])

  const activeInstId = instTab !== 'management' ? instTab : null
  const activeInst = instances.find(i => i.id === activeInstId)

  if (instances.length === 0) {
    return (
      <div>
        <h2 style={{ margin: '0 0 var(--spacing-lg)', fontFamily: 'var(--font-display)' }}>Unraid</h2>
        <SetupScreen onNavigate={onNavigate} />
      </div>
    )
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'var(--font-sans)',
    whiteSpace: 'nowrap',
  })

  return (
    <div>
      <h2 style={{ margin: '0 0 var(--spacing-md)', fontFamily: 'var(--font-display)' }}>Unraid</h2>

      {/* Instance tab bar */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', marginBottom: 'var(--spacing-lg)', gap: 4 }}>
        {instances.map(inst => (
          <button
            key={inst.id}
            style={{ ...tabStyle(instTab === inst.id), opacity: !inst.enabled ? 0.4 : 1, cursor: !inst.enabled ? 'not-allowed' : 'pointer' }}
            disabled={!inst.enabled}
            onClick={() => { setInstTab(inst.id); setSelected(inst.id); setContentTab('overview') }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: online[inst.id] ? 'var(--status-online)' : 'var(--text-muted)', animation: online[inst.id] ? 'pulse 2s infinite' : 'none', flexShrink: 0 }} />
              {inst.name}
            </span>
          </button>
        ))}
        <button style={tabStyle(false)} onClick={() => onNavigate?.('instances')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Settings2 size={14} /> {t('instance.manage')}</span>
        </button>
      </div>

      {activeInst && (
        <div>
          {/* Content tab bar */}
          <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', marginBottom: 'var(--spacing-lg)', gap: 4 }}>
            {CONTENT_TAB_KEYS.map(key => (
              <button key={key} style={tabStyle(contentTab === key)} onClick={() => setContentTab(key)}>
                {t(`ctab.${key}`)}
              </button>
            ))}
          </div>

          {contentTab === 'overview'      && <OverviewTab      instanceId={activeInst.id} />}
          {contentTab === 'array'         && <ArrayTab         instanceId={activeInst.id} />}
          {contentTab === 'docker'        && <DockerTab        instanceId={activeInst.id} />}
          {contentTab === 'vms'           && <VmsTab           instanceId={activeInst.id} />}
          {contentTab === 'shares'        && <SharesTab        instanceId={activeInst.id} />}
          {contentTab === 'notifications' && <NotificationsTab instanceId={activeInst.id} />}
          {contentTab === 'system'        && <SystemTab        instanceId={activeInst.id} />}
          {contentTab === 'ups'           && <UpsTab           instanceId={activeInst.id} />}
          {contentTab === 'logs'          && <LogsTab          instanceId={activeInst.id} />}
          {contentTab === 'plugins'       && <PluginsTab       instanceId={activeInst.id} />}
          {contentTab === 'apikeys'       && <ApiKeysTab       instanceId={activeInst.id} />}
        </div>
      )}
    </div>
  )
}
