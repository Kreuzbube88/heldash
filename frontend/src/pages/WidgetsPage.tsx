import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconPicker } from '../components/IconPicker'
import { useConfirm } from '../components/ConfirmDialog'
import { useWidgetStore } from '../store/useWidgetStore'
import { useDockerStore } from '../store/useDockerStore'
import { useDashboardStore } from '../store/useDashboardStore'
import { useStore } from '../store/useStore'
import { useHaStore } from '../store/useHaStore'
import { useArrStore } from '../store/useArrStore'
import { useInstanceStore } from '../store/useInstanceStore'
import { Trash2, Pencil, X, Check, Plus, Minus, LayoutDashboard, Shield, ShieldOff, Container, Play, Square, RotateCcw, Zap, Sun, ZapOff, Flame, BatteryCharging, Calendar, Film, Tv, Cloud, LayoutGrid } from 'lucide-react'
import type { Widget, ServerStatusConfig, AdGuardHomeConfig, CustomButtonConfig, HomeAssistantConfig, NginxPMConfig, HomeAssistantEnergyConfig, ServerStats, AdGuardStats, HaEntityState, NpmStats, EnergyData, CalendarWidgetConfig, CalendarEntry, WeatherWidgetConfig, WeatherStats } from '../types'
import { normalizeUrl, containerCounts } from '../utils'
import { getIconUrl } from '../api'
import { ArrCardContent, SabnzbdCardContent, SeerrCardContent, TYPE_COLORS as ARR_TYPE_COLORS } from '../components/MediaCard'
import { HelbackupWidget } from '../components/HelbackupWidget'

// ── Energy Widget compact view ─────────────────────────────────────────────────

function SmallCircularGauge({ value, size = 36 }: { value: number; size?: number }) {
  const r = size * 0.38
  const circumference = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, value / 100)) * circumference
  const cx = size / 2, cy = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--glass-border)" strokeWidth={size * 0.09} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10b981" strokeWidth={size * 0.09}
        strokeDasharray={`${dash} ${circumference}`}
        strokeDashoffset={circumference / 4}
        strokeLinecap="round" />
      <text x={cx} y={cy + size * 0.09} textAnchor="middle" fontSize={size * 0.22} fontWeight="bold"
        fill="var(--text-primary)">{value}%</text>
    </svg>
  )
}

export function HaEnergyWidgetView({ stats }: { stats: EnergyData }) {
  const { t } = useTranslation('widgets')
  if (stats.error && !stats.configured) {
    return <div style={{ fontSize: 12, color: 'var(--status-offline)' }}>{stats.error}</div>
  }
  if (!stats.configured) {
    return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('energy.not_configured')}</div>
  }
  const hasSolar = (stats.solar_production ?? 0) > 0
  const hasReturn = (stats.grid_return ?? 0) > 0
  const hasGas = (stats.gas_consumption ?? 0) > 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {hasSolar && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sun size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>
            {(stats.solar_production ?? 0).toFixed(1)}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('energy.solar')}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Zap size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{(stats.grid_consumption ?? 0).toFixed(1)}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('energy.grid')}</span>
      </div>
      {hasReturn && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ZapOff size={13} style={{ color: '#10b981', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>{(stats.grid_return ?? 0).toFixed(1)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('energy.return')}</span>
        </div>
      )}
      {hasGas && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Flame size={13} style={{ color: '#f87171', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f87171' }}>{(stats.gas_consumption ?? 0).toFixed(3)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('energy.gas')}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SmallCircularGauge value={stats.self_sufficiency ?? 0} size={36} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stats.period_label ?? t('energy.period_today')}</span>
      </div>
    </div>
  )
}

// ── Calendar widget content ────────────────────────────────────────────────────

function formatCalendarDate(dateStr: string, t: (key: string) => string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const d = new Date(dateStr + 'T00:00:00')
  if (d.getTime() === today.getTime()) return t('calendar.today')
  if (d.getTime() === tomorrow.getTime()) return t('calendar.tomorrow')
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export function CalendarWidgetContent({ entries, compact = false }: { entries: CalendarEntry[]; compact?: boolean }) {
  const { t } = useTranslation('widgets')
  if (compact) {
    const upcoming = entries.slice(0, 3)
    const more = entries.length - upcoming.length
    if (upcoming.length === 0) {
      return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('calendar.nothing_upcoming')}</span>
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {upcoming.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', minWidth: 52, flexShrink: 0 }}>{formatCalendarDate(e.date, t)}</span>
            {e.instanceType === 'radarr'
              ? <Film size={10} style={{ color: '#60a5fa', flexShrink: 0 }} />
              : <Tv size={10} style={{ color: '#a78bfa', flexShrink: 0 }} />}
            <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.title}{e.type === 'episode' && e.season_number != null ? ` S${String(e.season_number).padStart(2, '0')}E${String(e.episode_number ?? 0).padStart(2, '0')}` : ''}
            </span>
          </div>
        ))}
        {more > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('calendar.more', { count: more })}</span>}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0', color: 'var(--text-muted)' }}>
        <Calendar size={24} style={{ opacity: 0.4 }} />
        <span style={{ fontSize: 12 }}>{t('calendar.nothing_upcoming')}</span>
      </div>
    )
  }

  // Group by date
  const grouped: { date: string; items: CalendarEntry[] }[] = []
  for (const entry of entries) {
    const last = grouped[grouped.length - 1]
    if (last && last.date === entry.date) {
      last.items.push(entry)
    } else {
      grouped.push({ date: entry.date, items: [entry] })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 320, overflowY: 'auto' }}>
      {grouped.map(group => (
        <div key={group.date}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '8px 0 4px', borderBottom: '1px solid var(--glass-border)', marginBottom: 4 }}>
            {formatCalendarDate(group.date, t)}
          </div>
          {group.items.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <div style={{ width: 24, height: 24, borderRadius: 4, background: e.instanceType === 'radarr' ? 'rgba(96,165,250,0.12)' : 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {e.instanceType === 'radarr'
                  ? <Film size={12} style={{ color: '#60a5fa' }} />
                  : <Tv size={12} style={{ color: '#a78bfa' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.title}
                </div>
                {e.type === 'episode' && e.season_number != null && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    S{String(e.season_number).padStart(2, '0')}E{String(e.episode_number ?? 0).padStart(2, '0')}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, color: e.instanceType === 'radarr' ? '#60a5fa' : '#a78bfa', fontWeight: 600, flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                {e.instanceName}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Widget icon — URL-matched service icon or custom icon_id/icon_url ─────────
function WidgetIcon({ widget, size = 32 }: { widget: Pick<Widget, 'type' | 'config' | 'icon_url' | 'icon_id'>; size?: number }) {
  const { services } = useStore()

  if (widget.type === 'docker_overview') {
    const url = getIconUrl(widget)
    if (url) {
      return <img src={url} alt="" style={{ width: size, height: size, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
    }
    return <Container size={size * 0.8} style={{ color: 'var(--accent)', flexShrink: 0 }} />
  }

  let iconUrl: string | null = null
  let iconEmoji: string | null = null

  if (widget.type === 'adguard_home' || widget.type === 'pihole' || widget.type === 'home_assistant' || widget.type === 'nginx_pm') {
    const cfg = widget.config as { url?: string }
    const widgetUrl = normalizeUrl(cfg.url ?? '')
    const match = widgetUrl
      ? services.find(s => normalizeUrl(s.url) === widgetUrl || (s.check_url && normalizeUrl(s.check_url) === widgetUrl))
      : undefined
    iconUrl = (match ? getIconUrl(match) : null) ?? getIconUrl(widget)
    iconEmoji = match?.icon ?? null
  } else {
    iconUrl = getIconUrl(widget)
  }

  if (iconUrl) {
    return <img src={iconUrl} alt="" style={{ width: size, height: size, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
  }
  if (iconEmoji) {
    return <span style={{ fontSize: size * 0.7, lineHeight: 1, flexShrink: 0 }}>{iconEmoji}</span>
  }
  return null
}

// ── Docker Overview widget content ────────────────────────────────────────────
export function DockerOverviewContent({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation('widgets')
  const { containers, loadContainers, loadAllStats, controlContainer } = useDockerStore()
  const [selectedId, setSelectedId] = useState('')
  const [controlling, setControlling] = useState(false)
  const [ctrlError, setCtrlError] = useState('')

  useEffect(() => {
    loadContainers()
    loadAllStats()
    const t = setInterval(() => { loadContainers(); loadAllStats() }, 30_000)
    return () => clearInterval(t)
  }, [])

  const { running, stopped, restarting } = containerCounts(containers)

  const selectedContainer = containers.find(c => c.id === selectedId) ?? null

  const handleControl = async (action: 'start' | 'stop' | 'restart') => {
    if (!selectedId) return
    setCtrlError('')
    setControlling(true)
    try {
      await controlContainer(selectedId, action)
      await loadContainers()
    } catch (e: unknown) {
      setCtrlError((e as Error).message)
    } finally {
      setControlling(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Count grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {[
          { label: t('docker.total'),      value: containers.length, color: 'var(--accent)' },
          { label: t('docker.running'),    value: running,    color: 'var(--status-online)' },
          { label: t('docker.stopped'),    value: stopped,    color: 'var(--text-muted)' },
          { label: t('docker.restarting'), value: restarting, color: '#f59e0b' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 'var(--radius-sm)', border: `1px solid ${color}22`, background: `${color}0a` }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color, lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2, letterSpacing: '0.3px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Container selector + controls — admin only */}
      {isAdmin && containers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <select
            className="form-input"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{ fontSize: 12, padding: '5px 8px' }}
          >
            <option value="">{t('docker.select_container')}</option>
            {[...containers].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.state})</option>
            ))}
          </select>
          {selectedId && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => handleControl('start')}
                disabled={controlling || selectedContainer?.state === 'running'}
                style={{ flex: 1, gap: 3, fontSize: 11, padding: '4px 6px', color: (!controlling && selectedContainer?.state !== 'running') ? 'var(--status-online)' : undefined, borderColor: (!controlling && selectedContainer?.state !== 'running') ? 'rgba(34,197,94,0.35)' : undefined }}>
                {controlling ? <div className="spinner" style={{ width: 8, height: 8, borderWidth: 1.5 }} /> : <Play size={10} />} {t('docker.start')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleControl('stop')}
                disabled={controlling || selectedContainer?.state !== 'running'}
                style={{ flex: 1, gap: 3, fontSize: 11, padding: '4px 6px', color: (!controlling && selectedContainer?.state === 'running') ? 'var(--status-offline)' : undefined, borderColor: (!controlling && selectedContainer?.state === 'running') ? 'rgba(239,68,68,0.35)' : undefined }}>
                {controlling ? <div className="spinner" style={{ width: 8, height: 8, borderWidth: 1.5 }} /> : <Square size={10} />} {t('docker.stop')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleControl('restart')}
                disabled={controlling}
                style={{ flex: 1, gap: 3, fontSize: 11, padding: '4px 6px', color: !controlling ? '#f59e0b' : undefined, borderColor: !controlling ? 'rgba(245,158,11,0.35)' : undefined }}>
                {controlling ? <div className="spinner" style={{ width: 8, height: 8, borderWidth: 1.5 }} /> : <RotateCcw size={10} />} {t('docker.restart')}
              </button>
            </div>
          )}
          {ctrlError && (
            <div style={{ fontSize: 11, color: 'var(--status-offline)' }}>{ctrlError}</div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Disk config row ───────────────────────────────────────────────────────────
function DiskRow({
  disk,
  onChange,
  onRemove,
}: {
  disk: { path: string; name: string }
  onChange: (d: { path: string; name: string }) => void
  onRemove: () => void
}) {
  const { t } = useTranslation('widgets')
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        className="form-input"
        placeholder={t('form.disk_name_placeholder')}
        value={disk.name}
        onChange={e => onChange({ ...disk, name: e.target.value })}
        style={{ flex: 1, minWidth: 0, fontSize: 13, padding: '5px 8px' }}
      />
      <input
        className="form-input"
        placeholder={t('form.disk_path_placeholder')}
        value={disk.path}
        onChange={e => onChange({ ...disk, path: e.target.value })}
        style={{ flex: 2, minWidth: 0, fontSize: 13, padding: '5px 8px' }}
      />
      <button
        type="button"
        className="btn btn-ghost btn-icon btn-sm"
        onClick={onRemove}
        style={{ flexShrink: 0, padding: '4px', width: 28, height: 28 }}
      >
        <Minus size={12} />
      </button>
    </div>
  )
}

// ── Entity row (Home Assistant) ───────────────────────────────────────────────
function EntityRow({
  entity,
  onChange,
  onRemove,
}: {
  entity: { entity_id: string; label: string }
  onChange: (e: { entity_id: string; label: string }) => void
  onRemove: () => void
}) {
  const { t } = useTranslation('widgets')
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        className="form-input"
        placeholder={t('form.entity_label_placeholder')}
        value={entity.label}
        onChange={e => onChange({ ...entity, label: e.target.value })}
        style={{ flex: 1, minWidth: 0, fontSize: 13, padding: '5px 8px' }}
      />
      <input
        className="form-input"
        placeholder={t('form.entity_id_placeholder')}
        value={entity.entity_id}
        onChange={e => onChange({ ...entity, entity_id: e.target.value })}
        style={{ flex: 2, minWidth: 0, fontSize: 13, padding: '5px 8px' }}
      />
      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onRemove} style={{ flexShrink: 0, padding: '4px', width: 28, height: 28 }}>
        <Minus size={12} />
      </button>
    </div>
  )
}

// ── Home Assistant entity state view ─────────────────────────────────────────
export function HaStatsView({
  entities,
  widgetId,
  isAdmin,
}: {
  entities: HaEntityState[]
  widgetId: string
  isAdmin: boolean
}) {
  const { t } = useTranslation('widgets')
  const { haToggle } = useWidgetStore()
  const [toggling, setToggling] = useState<string | null>(null)

  if (entities.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>{t('ha_widget.no_entities')}</div>
  }

  const handleToggle = async (entityId: string, currentState: string) => {
    setToggling(entityId)
    try { await haToggle(widgetId, entityId, currentState) }
    finally { setToggling(null) }
  }

  const toggleableDomains = ['switch', 'light', 'input_boolean', 'automation', 'fan']

  const stateColor = (state: string): string | undefined => {
    if (['on', 'open', 'unlocked', 'playing', 'home', 'active'].includes(state)) return 'var(--status-online)'
    if (['off', 'closed', 'locked', 'paused', 'idle', 'standby'].includes(state)) return 'var(--text-muted)'
    if (['unavailable', 'unknown'].includes(state)) return 'var(--text-muted)'
    return undefined
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entities.map(e => {
        const domain = e.entity_id.split('.')[0]
        const isToggleable = toggleableDomains.includes(domain)
        const isOn = e.state === 'on'
        const isUnavailable = e.state === 'unavailable' || e.state === 'unknown'
        const displayLabel = e.label || e.friendly_name || e.entity_id
        return (
          <div key={e.entity_id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>{displayLabel}</span>
            {isUnavailable ? (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>unavailable</span>
            ) : e.unit ? (
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 600 }}>
                {e.state} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.unit}</span>
              </span>
            ) : isToggleable ? (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleToggle(e.entity_id, e.state)}
                disabled={toggling === e.entity_id}
                style={{ fontSize: 11, padding: '2px 10px', gap: 4, color: isOn ? 'var(--status-online)' : 'var(--text-muted)', borderColor: isOn ? 'rgba(34,197,94,0.35)' : undefined, minWidth: 54 }}
              >
                {toggling === e.entity_id
                  ? <div className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                  : isOn ? t('ha_widget.on') : t('ha_widget.off')
                }
              </button>
            ) : (
              <span style={{ fontSize: 11, color: stateColor(e.state) ?? 'var(--text-secondary)' }}>{e.state}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Custom buttons view ───────────────────────────────────────────────────────
export function CustomButtonsView({ widget }: { widget: Widget }) {
  const { t } = useTranslation('widgets')
  const { triggerButton } = useWidgetStore()
  const config = widget.config as CustomButtonConfig
  const [triggering, setTriggering] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, 'ok' | 'err'>>({})

  if (!config.buttons?.length) {
    return <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>{t('custom_button.no_buttons')}</div>
  }

  const handleTrigger = async (buttonId: string) => {
    if (triggering) return
    setTriggering(buttonId)
    try {
      await triggerButton(widget.id, buttonId)
      setResults(r => ({ ...r, [buttonId]: 'ok' }))
      setTimeout(() => setResults(r => { const n = { ...r }; delete n[buttonId]; return n }), 2000)
    } catch {
      setResults(r => ({ ...r, [buttonId]: 'err' }))
      setTimeout(() => setResults(r => { const n = { ...r }; delete n[buttonId]; return n }), 3000)
    } finally {
      setTriggering(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {config.buttons.map(btn => (
        <button
          key={btn.id}
          className="btn btn-ghost btn-sm"
          onClick={() => handleTrigger(btn.id)}
          disabled={triggering === btn.id}
          style={{
            gap: 6, justifyContent: 'flex-start', fontSize: 13, padding: '7px 10px',
            color: results[btn.id] === 'ok' ? 'var(--status-online)' : results[btn.id] === 'err' ? 'var(--status-offline)' : undefined,
            borderColor: results[btn.id] === 'ok' ? 'rgba(34,197,94,0.35)' : results[btn.id] === 'err' ? 'rgba(239,68,68,0.35)' : undefined,
          }}
        >
          {triggering === btn.id
            ? <div className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
            : <Zap size={12} style={{ flexShrink: 0 }} />
          }
          <span style={{ flex: 1, textAlign: 'left' }}>{btn.label}</span>
          {results[btn.id] === 'ok' && <Check size={11} />}
          {results[btn.id] === 'err' && <X size={11} />}
        </button>
      ))}
    </div>
  )
}

// ── Widget form (create or edit) ───────────────────────────────────────────────
function WidgetForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Widget
  onSave: (data: { name: string; type: string; config: object; display_location: 'topbar' | 'sidebar' | 'none'; iconId?: string | null; iconChanged?: boolean }) => Promise<void>
  onCancel: () => void
}) {
  const isEdit = !!initial
  type WidgetFormType = 'server_status' | 'adguard_home' | 'docker_overview' | 'custom_button' | 'home_assistant' | 'pihole' | 'nginx_pm' | 'home_assistant_energy' | 'calendar' | 'weather'
  const [type, setType] = useState<WidgetFormType>(
    (initial?.type as WidgetFormType) ?? 'server_status'
  )
  const { instances: haInstances, loadInstances: loadHaInstances } = useHaStore()
  const { instances: arrInstances, loadInstances: loadArrInstances } = useArrStore()
  const [name, setName] = useState(initial?.name ?? '')
  const [displayLocation, setDisplayLocation] = useState<'topbar' | 'sidebar' | 'none'>(
    (initial?.display_location ?? 'none') as 'topbar' | 'sidebar' | 'none'
  )

  // server_status config
  const [disks, setDisks] = useState<{ path: string; name: string }[]>(
    initial?.type === 'server_status' ? (initial.config as ServerStatusConfig).disks ?? [] : []
  )

  // adguard_home config
  const existingAdGuard = initial?.type === 'adguard_home' ? (initial.config as AdGuardHomeConfig) : null
  const [agUrl, setAgUrl] = useState(existingAdGuard?.url ?? '')
  const [agUsername, setAgUsername] = useState(existingAdGuard?.username ?? '')
  const [agPassword, setAgPassword] = useState('')  // blank = keep existing on edit

  // custom_button config
  const [buttons, setButtons] = useState<{ id: string; label: string; url: string; method: 'GET' | 'POST' }[]>(
    initial?.type === 'custom_button' ? (initial.config as CustomButtonConfig).buttons ?? [] : []
  )

  // home_assistant config
  const existingHa = initial?.type === 'home_assistant' ? (initial.config as HomeAssistantConfig) : null
  const [haUrl, setHaUrl] = useState(existingHa?.url ?? '')
  const [haToken, setHaToken] = useState('')  // blank = keep existing on edit
  const [haEntities, setHaEntities] = useState<{ entity_id: string; label: string }[]>(existingHa?.entities ?? [])

  // pihole config
  const existingPihole = initial?.type === 'pihole' ? (initial.config as { url?: string }) : null
  const [phUrl, setPhUrl] = useState(existingPihole?.url ?? '')
  const [phPassword, setPhPassword] = useState('')  // blank = keep existing on edit

  // nginx_pm config
  const existingNpm = initial?.type === 'nginx_pm' ? (initial.config as NginxPMConfig) : null
  const [npmUrl, setNpmUrl] = useState(existingNpm?.url ?? '')
  const [npmUsername, setNpmUsername] = useState(existingNpm?.username ?? '')
  const [npmPassword, setNpmPassword] = useState('')  // blank = keep existing on edit

  // home_assistant_energy config
  const existingEnergy = initial?.type === 'home_assistant_energy' ? (initial.config as HomeAssistantEnergyConfig) : null
  const [energyInstanceId, setEnergyInstanceId] = useState(existingEnergy?.instance_id ?? '')
  const [energyPeriod, setEnergyPeriod] = useState<'day' | 'week' | 'month'>(existingEnergy?.period ?? 'day')

  // calendar config
  const existingCal = initial?.type === 'calendar' ? (initial.config as CalendarWidgetConfig) : null
  const [calInstanceIds, setCalInstanceIds] = useState<string[]>(existingCal?.instance_ids ?? [])
  const [calDaysAhead, setCalDaysAhead] = useState(existingCal?.days_ahead ?? 14)

  // weather config
  const existingWeather = initial?.type === 'weather' ? (initial.config as WeatherWidgetConfig) : null
  const [weatherInputMode, setWeatherInputMode] = useState<'city' | 'coords'>('coords')
  const [weatherCity, setWeatherCity] = useState('')
  const [weatherLat, setWeatherLat] = useState(existingWeather ? String(existingWeather.lat) : '')
  const [weatherLon, setWeatherLon] = useState(existingWeather ? String(existingWeather.lon) : '')
  const [weatherLocationName, setWeatherLocationName] = useState(existingWeather?.location_name ?? '')
  const [weatherGeoError, setWeatherGeoError] = useState('')
  const [weatherGeocoding, setWeatherGeocoding] = useState(false)

  // icon
  const [iconId, setIconId] = useState<string | null>(initial?.icon_id ?? null)
  const [iconChanged, setIconChanged] = useState(false)

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const { t } = useTranslation('widgets')

  // Load HA instances when energy type is selected; ARR instances for calendar
  useEffect(() => {
    if (type === 'home_assistant_energy') loadHaInstances().catch(() => {})
    if (type === 'calendar') loadArrInstances().catch(() => {})
  }, [type])

  // Update default name when type changes (only on create)
  const getDefaultNameForType = (t: WidgetFormType): string => {
    if (t === 'adguard_home') return 'AdGuard Home'
    if (t === 'docker_overview') return 'Docker Overview'
    if (t === 'custom_button') return 'Quick Actions'
    if (t === 'home_assistant') return 'Home Assistant'
    if (t === 'pihole') return 'Pi-hole'
    if (t === 'nginx_pm') return 'Nginx Proxy Manager'
    if (t === 'home_assistant_energy') return 'HA Energy'
    if (t === 'calendar') return 'Upcoming'
    if (t === 'weather') return 'Weather'
    return 'Server Status'
  }

  const handleTypeChange = (t: WidgetFormType) => {
    setType(t)
    if (!isEdit && !name) {
      setName(getDefaultNameForType(t))
    }
  }

  const handleSave = async () => {
    setError('')
    if (!name.trim()) return setError(t('form.errors.name_required'))

    let config: object
    if (type === 'server_status') {
      config = { disks }
    } else if (type === 'docker_overview') {
      config = {}
    } else if (type === 'custom_button') {
      config = { buttons }
    } else if (type === 'home_assistant') {
      if (!haUrl.trim()) return setError(t('form.errors.url_required'))
      if (!isEdit && !haToken) return setError(t('form.errors.token_required'))
      config = { url: haUrl.trim(), entities: haEntities, ...(haToken ? { token: haToken } : {}) }
    } else if (type === 'pihole') {
      if (!phUrl.trim()) return setError(t('form.errors.url_required'))
      if (!isEdit && !phPassword) return setError(t('form.errors.password_required'))
      config = { url: phUrl.trim(), ...(phPassword ? { password: phPassword } : {}) }
    } else if (type === 'nginx_pm') {
      if (!npmUrl.trim()) return setError(t('form.errors.url_required'))
      if (!npmUsername.trim()) return setError(t('form.errors.username_required'))
      if (!isEdit && !npmPassword) return setError(t('form.errors.password_required'))
      config = { url: npmUrl.trim(), username: npmUsername.trim(), ...(npmPassword ? { password: npmPassword } : {}) }
    } else if (type === 'home_assistant_energy') {
      if (!energyInstanceId) return setError(t('form.errors.ha_instance_required'))
      config = { instance_id: energyInstanceId, period: energyPeriod }
    } else if (type === 'calendar') {
      if (calInstanceIds.length === 0) return setError(t('form.errors.calendar_instance_required'))
      const days = Math.max(1, Math.min(30, calDaysAhead))
      config = { instance_ids: calInstanceIds, days_ahead: days }
    } else if (type === 'weather') {
      if (weatherInputMode === 'city') {
        if (!weatherCity.trim()) return setError(t('form.errors.city_required'))
        setWeatherGeoError('')
        setWeatherGeocoding(true)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(weatherCity.trim())}&format=json&limit=1`)
          const geoData = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
          if (!geoData.length) {
            setWeatherGeoError(t('form.weather_city_not_found'))
            setWeatherGeocoding(false)
            return
          }
          const locationName = weatherLocationName.trim() || geoData[0].display_name.split(',')[0].trim()
          config = { lat: parseFloat(geoData[0].lat), lon: parseFloat(geoData[0].lon), location_name: locationName }
        } catch {
          setWeatherGeoError(t('form.weather_geocoding_failed'))
          setWeatherGeocoding(false)
          return
        }
        setWeatherGeocoding(false)
      } else {
        const latNum = parseFloat(weatherLat)
        const lonNum = parseFloat(weatherLon)
        if (isNaN(latNum) || isNaN(lonNum)) return setError(t('form.errors.coords_required'))
        config = { lat: latNum, lon: lonNum, ...(weatherLocationName.trim() ? { location_name: weatherLocationName.trim() } : {}) }
      }
    } else {
      if (!agUrl.trim()) return setError(t('form.errors.url_required'))
      if (!agUsername.trim()) return setError(t('form.errors.username_required'))
      if (!isEdit && !agPassword) return setError(t('form.errors.password_required'))
      config = { url: agUrl.trim(), username: agUsername.trim(), ...(agPassword ? { password: agPassword } : {}) }
    }

    setSaving(true)
    try {
      await onSave({ name: name.trim(), type, config, display_location: displayLocation, iconId, iconChanged })
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const addDisk = () => setDisks(d => [...d, { name: '', path: '' }])
  const updateDisk = (i: number, disk: { name: string; path: string }) =>
    setDisks(d => d.map((x, idx) => idx === i ? disk : x))
  const removeDisk = (i: number) => setDisks(d => d.filter((_, idx) => idx !== i))

  const addButton = () => setButtons(b => [...b, { id: Math.random().toString(36).slice(2), label: '', url: '', method: 'POST' as const }])
  const updateButton = (i: number, btn: { id: string; label: string; url: string; method: 'GET' | 'POST' }) =>
    setButtons(b => b.map((x, idx) => idx === i ? btn : x))
  const removeButton = (i: number) => setButtons(b => b.filter((_, idx) => idx !== i))

  const addEntity = () => setHaEntities(e => [...e, { entity_id: '', label: '' }])
  const updateEntity = (i: number, entity: { entity_id: string; label: string }) =>
    setHaEntities(e => e.map((x, idx) => idx === i ? entity : x))
  const removeEntity = (i: number) => setHaEntities(e => e.filter((_, idx) => idx !== i))

  return (
    <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
        {isEdit ? t('form.title_edit') : t('form.title_new')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Type selector — only on create */}
        {!isEdit && (
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>{t('form.type_label')}</label>
            <select
              className="form-input"
              value={type}
              onChange={e => handleTypeChange(e.target.value as WidgetFormType)}
            >
              <option value="adguard_home">{t('type_names.adguard_home')}</option>
              <option value="calendar">{t('type_names.calendar')}</option>
              <option value="custom_button">{t('type_names.custom_button')}</option>
              <option value="docker_overview">{t('type_names.docker_overview')}</option>
              <option value="home_assistant">{t('type_names.home_assistant')}</option>
              <option value="home_assistant_energy">{t('type_names.home_assistant_energy')}</option>
              <option value="nginx_pm">{t('type_names.nginx_pm')}</option>
              <option value="pihole">{t('type_names.pihole')}</option>
              <option value="server_status">{t('type_names.server_status')}</option>
              <option value="weather">{t('type_names.weather')}</option>
            </select>
          </div>
        )}

        <div>
          <label className="form-label" style={{ fontSize: 11 }}>{t('form.name_label')}</label>
          <input
            className="form-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={type === 'adguard_home' ? 'AdGuard Home' : type === 'docker_overview' ? 'Docker Overview' : 'Server Status'}
          />
        </div>

        {/* Icon */}
        {type !== 'weather' && (
          <div>
            <label className="form-label" style={{ fontSize: 11 }}>
              {t('form.icon_label')}
              {type === 'adguard_home' && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{t('form.icon_hint_adguard')}</span>}
              {type === 'docker_overview' && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{t('form.icon_hint_docker')}</span>}
            </label>
            <IconPicker
              iconId={iconId}
              iconUrl={(!iconChanged && isEdit && initial) ? getIconUrl(initial) : null}
              onChange={id => { setIconId(id); setIconChanged(true) }}
            />
          </div>
        )}

        <div>
          <label className="form-label" style={{ fontSize: 11 }}>{t('form.display_location_label')}</label>
          <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '6px 8px', display: 'flex', gap: 2 }}>
            {(['topbar', 'sidebar', 'none'] as const).map(loc => (
              <button
                key={loc}
                type="button"
                onClick={() => setDisplayLocation(loc)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  fontWeight: displayLocation === loc ? 600 : 400,
                  background: displayLocation === loc ? 'rgba(var(--accent-rgb), 0.12)' : 'transparent',
                  color: displayLocation === loc ? 'var(--accent)' : 'var(--text-secondary)',
                  border: displayLocation === loc ? '1px solid rgba(var(--accent-rgb), 0.25)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  textTransform: 'capitalize',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {loc === 'topbar' && '📊'}
                {loc === 'sidebar' && '📌'}
                {loc === 'none' && '✕'}
                {' '}{loc}
              </button>
            ))}
          </div>
        </div>

        {/* server_status config */}
        {type === 'server_status' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ fontSize: 11, margin: 0 }}>{t('form.disks_label')}</label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addDisk} style={{ gap: 4, fontSize: 11, padding: '3px 8px' }}>
                <Plus size={11} /> {t('form.add_disk')}
              </button>
            </div>
            {disks.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('form.disk_no_disks')}</span>
            )}
            {disks.map((d, i) => (
              <DiskRow key={i} disk={d} onChange={disk => updateDisk(i, disk)} onRemove={() => removeDisk(i)} />
            ))}
          </div>
        )}

        {/* adguard_home config */}
        {type === 'adguard_home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>{t('form.adguard_url')}</label>
              <input
                className="form-input"
                value={agUrl}
                onChange={e => setAgUrl(e.target.value)}
                placeholder="http://192.168.1.1:80"
                style={{ fontSize: 13 }}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>{t('form.username')}</label>
              <input
                className="form-input"
                value={agUsername}
                onChange={e => setAgUsername(e.target.value)}
                placeholder="admin"
                autoComplete="off"
                style={{ fontSize: 13 }}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>
                {t('form.password')}{isEdit && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{t('form.keep_existing')}</span>}
              </label>
              <input
                className="form-input"
                type="password"
                value={agPassword}
                onChange={e => setAgPassword(e.target.value)}
                placeholder={isEdit ? '••••••••' : t('form.password')}
                autoComplete="new-password"
                style={{ fontSize: 13 }}
              />
            </div>
          </div>
        )}

        {/* custom_button config */}
        {type === 'custom_button' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ fontSize: 11, margin: 0 }}>{t('form.buttons_label')}</label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addButton} style={{ gap: 4, fontSize: 11, padding: '3px 8px' }}>
                <Plus size={11} /> {t('form.add_button')}
              </button>
            </div>
            {buttons.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('form.no_buttons_form')}</span>
            )}
            {buttons.map((btn, i) => (
              <div key={btn.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="form-input" placeholder={t('form.button_label_placeholder')} value={btn.label} onChange={e => updateButton(i, { ...btn, label: e.target.value })} style={{ flex: 1, minWidth: 0, fontSize: 13, padding: '5px 8px' }} />
                <input className="form-input" placeholder="URL" value={btn.url} onChange={e => updateButton(i, { ...btn, url: e.target.value })} style={{ flex: 2, minWidth: 0, fontSize: 13, padding: '5px 8px' }} />
                <select className="form-input" value={btn.method} onChange={e => updateButton(i, { ...btn, method: e.target.value as 'GET' | 'POST' })} style={{ width: 72, fontSize: 12, padding: '5px 6px' }}>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeButton(i)} style={{ flexShrink: 0, padding: '4px', width: 28, height: 28 }}><Minus size={12} /></button>
              </div>
            ))}
          </div>
        )}

        {/* home_assistant config */}
        {type === 'home_assistant' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>{t('form.ha_url')}</label>
              <input className="form-input" value={haUrl} onChange={e => setHaUrl(e.target.value)} placeholder="http://homeassistant.local:8123" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>
                {t('form.ha_token')}{isEdit && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{t('form.keep_existing')}</span>}
              </label>
              <input className="form-input" type="password" value={haToken} onChange={e => setHaToken(e.target.value)} placeholder={isEdit ? '••••••••' : 'Token from HA Profile → Long-Lived Access Tokens'} autoComplete="new-password" style={{ fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label" style={{ fontSize: 11, margin: 0 }}>{t('form.entities_label')}</label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addEntity} style={{ gap: 4, fontSize: 11, padding: '3px 8px' }}>
                <Plus size={11} /> {t('form.add_entity')}
              </button>
            </div>
            {haEntities.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('form.no_entities_form')}</span>
            )}
            {haEntities.map((e, i) => (
              <EntityRow key={i} entity={e} onChange={entity => updateEntity(i, entity)} onRemove={() => removeEntity(i)} />
            ))}
          </div>
        )}

        {/* pihole config */}
        {type === 'pihole' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>{t('form.pihole_url')}</label>
              <input className="form-input" value={phUrl} onChange={e => setPhUrl(e.target.value)} placeholder="http://192.168.1.1" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>
                {t('form.pihole_password')}{isEdit && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{t('form.keep_existing')}</span>}
              </label>
              <input className="form-input" type="password" value={phPassword} onChange={e => setPhPassword(e.target.value)} placeholder={isEdit ? '••••••••' : t('form.pihole_password')} autoComplete="new-password" style={{ fontSize: 13 }} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{t('form.pihole_v6')}</p>
          </div>
        )}

        {/* home_assistant_energy config */}
        {type === 'home_assistant_energy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>{t('form.ha_instance')}</label>
              <select className="form-input" value={energyInstanceId} onChange={e => setEnergyInstanceId(e.target.value)} style={{ fontSize: 13 }}>
                <option value="">{t('form.ha_select_instance')}</option>
                {haInstances.filter(i => i.enabled).map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>{t('form.energy_period')}</label>
              <select className="form-input" value={energyPeriod} onChange={e => setEnergyPeriod(e.target.value as 'day' | 'week' | 'month')} style={{ fontSize: 13 }}>
                <option value="day">{t('form.energy_today')}</option>
                <option value="week">{t('form.energy_week')}</option>
                <option value="month">{t('form.energy_month')}</option>
              </select>
            </div>
          </div>
        )}

        {/* nginx_pm config */}
        {type === 'nginx_pm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>{t('form.nginx_url')}</label>
              <input className="form-input" value={npmUrl} onChange={e => setNpmUrl(e.target.value)} placeholder="http://npm.local:81" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>{t('form.username_email')}</label>
              <input className="form-input" value={npmUsername} onChange={e => setNpmUsername(e.target.value)} placeholder="admin@example.com" autoComplete="off" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>
                {t('form.password')}{isEdit && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>{t('form.keep_existing')}</span>}
              </label>
              <input className="form-input" type="password" value={npmPassword} onChange={e => setNpmPassword(e.target.value)} placeholder={isEdit ? '••••••••' : t('form.password')} autoComplete="new-password" style={{ fontSize: 13 }} />
            </div>
          </div>
        )}

        {/* weather config */}
        {type === 'weather' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => { setWeatherInputMode('city'); setWeatherGeoError('') }}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12, border: weatherInputMode === 'city' ? '2px solid var(--accent)' : '2px solid var(--glass-border)', background: weatherInputMode === 'city' ? 'var(--accent-subtle)' : 'var(--glass-bg)', cursor: 'pointer' }}
              >
                {t('form.weather_input_city')}
              </button>
              <button
                type="button"
                onClick={() => { setWeatherInputMode('coords'); setWeatherGeoError('') }}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12, border: weatherInputMode === 'coords' ? '2px solid var(--accent)' : '2px solid var(--glass-border)', background: weatherInputMode === 'coords' ? 'var(--accent-subtle)' : 'var(--glass-bg)', cursor: 'pointer' }}
              >
                {t('form.weather_input_coords')}
              </button>
            </div>
            {weatherInputMode === 'city' ? (
              <div>
                <label className="form-label" style={{ fontSize: 11 }}>{t('form.weather_city_label')}</label>
                <input className="form-input" value={weatherCity} onChange={e => { setWeatherCity(e.target.value); setWeatherGeoError('') }} placeholder={t('form.weather_city_placeholder')} style={{ fontSize: 13 }} />
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>{t('form.weather_lat')}</label>
                  <input className="form-input" value={weatherLat} onChange={e => setWeatherLat(e.target.value)} placeholder="51.5074" style={{ fontSize: 13 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>{t('form.weather_lon')}</label>
                  <input className="form-input" value={weatherLon} onChange={e => setWeatherLon(e.target.value)} placeholder="-0.1278" style={{ fontSize: 13 }} />
                </div>
              </div>
            )}
            {weatherGeoError && <div style={{ fontSize: 11, color: 'var(--status-offline)' }}>{weatherGeoError}</div>}
            {weatherGeocoding && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('form.weather_geocoding')}</div>}
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>{t('form.weather_location_name')}</label>
              <input className="form-input" value={weatherLocationName} onChange={e => setWeatherLocationName(e.target.value)} placeholder={t('form.weather_location_placeholder')} style={{ fontSize: 13 }} />
            </div>
          </div>
        )}

        {/* calendar config */}
        {type === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>{t('form.calendar_instances')}</label>
              {arrInstances.filter(i => i.enabled && (i.type === 'radarr' || i.type === 'sonarr')).length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('form.calendar_no_instances')}</span>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {arrInstances.filter(i => i.enabled && (i.type === 'radarr' || i.type === 'sonarr')).map(inst => (
                  <label key={inst.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={calInstanceIds.includes(inst.id)}
                      onChange={e => {
                        if (e.target.checked) setCalInstanceIds(ids => [...ids, inst.id])
                        else setCalInstanceIds(ids => ids.filter(id => id !== inst.id))
                      }}
                    />
                    <span style={{ color: inst.type === 'radarr' ? '#60a5fa' : '#a78bfa', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {inst.type === 'radarr' ? 'R' : 'S'}
                    </span>
                    {inst.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>{t('form.calendar_days_ahead')}</label>
              <input
                className="form-input"
                type="number"
                min={1}
                max={30}
                value={calDaysAhead}
                onChange={e => setCalDaysAhead(Math.max(1, Math.min(30, parseInt(e.target.value) || 14)))}
                style={{ fontSize: 13, width: 80 }}
              />
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--status-offline)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ gap: 4 }}>
          <Check size={12} /> {saving ? t('form.saving') : t('form.save')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel} style={{ gap: 4 }}>
          <X size={12} /> {t('form.cancel')}
        </button>
      </div>
    </div>
  )
}

// ── Widget card ───────────────────────────────────────────────────────────────
function WidgetCard({
  widget,
  onEdit,
  onDelete,
  onToggleDashboard,
  isOnDashboard,
}: {
  widget: Widget
  onEdit: () => void
  onDelete: () => void
  onToggleDashboard: () => void
  isOnDashboard: boolean
}) {
  const { t } = useTranslation('widgets')
  const { isAdmin } = useStore()
  const { stats, setAdGuardProtection, setPiholeProtection } = useWidgetStore()
  const s = stats[widget.id]
  const [toggling, setToggling] = useState(false)

  const handleProtectionToggle = async () => {
    if (!isAdmin || widget.type !== 'adguard_home' || !s) return
    const ag = s as AdGuardStats
    setToggling(true)
    try {
      await setAdGuardProtection(widget.id, !ag.protection_enabled)
    } finally {
      setToggling(false)
    }
  }

  const handlePiholeToggle = async () => {
    if (!isAdmin || widget.type !== 'pihole' || !s) return
    const ph = s as AdGuardStats
    setToggling(true)
    try {
      await setPiholeProtection(widget.id, !ph.protection_enabled)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <WidgetIcon widget={widget} size={32} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{widget.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8 }}>
              <span>{t(`type_names.${widget.type}`, t('type_names.server_status'))}</span>
              {widget.display_location === 'topbar' && <span style={{ color: 'var(--accent)' }}>{t('location_display.topbar')}</span>}
              {widget.display_location === 'sidebar' && <span style={{ color: 'var(--accent)' }}>{t('location_display.sidebar')}</span>}
            </div>
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} data-tooltip="Edit" style={{ padding: '4px', width: 28, height: 28 }}>
              <Pencil size={12} />
            </button>
            <button className="btn btn-danger btn-icon btn-sm" onClick={onDelete} data-tooltip="Delete" style={{ padding: '4px', width: 28, height: 28 }}>
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Stats preview — branched by widget type */}
      {widget.type === 'docker_overview' ? (
        <DockerOverviewContent isAdmin={isAdmin} />
      ) : widget.type === 'custom_button' ? (
        <CustomButtonsView widget={widget} />
      ) : widget.type === 'server_status' ? (
        s ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(() => {
              const ss = s as ServerStats
              return (
                <>
                  <StatBar label={t('server_status.cpu')} value={ss.cpu.load >= 0 ? ss.cpu.load : null} unit="%" />
                  <StatBar label={t('server_status.ram')} value={ss.ram.total > 0 ? Math.round((ss.ram.used / ss.ram.total) * 100) : null} unit="%" extra={ss.ram.total > 0 ? `${(ss.ram.used / 1024).toFixed(1)} / ${(ss.ram.total / 1024).toFixed(1)} GB` : undefined} />
                  {ss.disks.map(d => (
                    d.error === 'not_mounted'
                      ? <div key={d.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.name}</span>
                          <span className="badge-error" style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>{t('server_status.not_mounted')}</span>
                        </div>
                      : d.duplicate
                        ? <div key={d.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.name}</span>
                            <span className="badge-warning" style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>{t('server_status.duplicate_of', { name: d.duplicateOf })}</span>
                          </div>
                        : <StatBar key={d.path} label={d.name} value={d.total > 0 ? Math.round((d.used / d.total) * 100) : null} unit="%" extra={d.total > 0 ? `${(d.used / 1024).toFixed(0)} / ${(d.total / 1024).toFixed(0)} GB` : undefined} />
                  ))}
                </>
              )
            })()}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>{t('loading.stats')}</div>
        )
      ) : widget.type === 'pihole' ? (
        s ? (
          <AdGuardStatsView
            stats={s as AdGuardStats}
            isAdmin={isAdmin}
            toggling={toggling}
            onToggle={handlePiholeToggle}
          />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>{t('loading.stats')}</div>
        )
      ) : widget.type === 'home_assistant' ? (
        s ? (
          <HaStatsView entities={s as HaEntityState[]} widgetId={widget.id} isAdmin={isAdmin} />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>{t('loading.states')}</div>
        )
      ) : widget.type === 'nginx_pm' ? (
        s ? (
          <NginxPMStatsView stats={s as NpmStats & { error?: string }} />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>{t('loading.stats')}</div>
        )
      ) : widget.type === 'home_assistant_energy' ? (
        s ? (
          <HaEnergyWidgetView stats={s as EnergyData} />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>{t('loading.stats')}</div>
        )
      ) : widget.type === 'calendar' ? (
        s ? (
          <CalendarWidgetContent entries={s as CalendarEntry[]} />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>{t('loading.calendar')}</div>
        )
      ) : widget.type === 'weather' ? (
        s ? (
          <WeatherWidgetView stats={s as WeatherStats} config={widget.config as WeatherWidgetConfig} />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>{t('loading.weather')}</div>
        )
      ) : widget.type === 'helbackup' ? (
        <HelbackupWidget />
      ) : (
        // adguard_home
        s ? (
          <AdGuardStatsView
            stats={s as AdGuardStats}
            isAdmin={isAdmin}
            toggling={toggling}
            onToggle={handleProtectionToggle}
          />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>{t('loading.stats')}</div>
        )
      )}

      {/* Dashboard toggle — admin only */}
      {isAdmin && (
        <button
          className={isOnDashboard ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
          onClick={onToggleDashboard}
          style={{ gap: 4, fontSize: 12, alignSelf: 'flex-start' }}
        >
          <LayoutDashboard size={12} />
          {isOnDashboard ? t('dashboard_toggle.on') : t('dashboard_toggle.add')}
        </button>
      )}
    </div>
  )
}

// ── Weather widget view ───────────────────────────────────────────────────────

const WEATHER_ICONS: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
  80: '🌦️', 81: '🌦️', 82: '🌧️',
  85: '🌨️', 86: '🌨️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

export function WeatherWidgetView({ stats, config }: { stats: WeatherStats; config: WeatherWidgetConfig }) {
  const { t } = useTranslation('widgets')
  if (stats.error) {
    return <div style={{ fontSize: 12, color: 'var(--status-offline)' }}>{stats.error}</div>
  }
  const desc = t(`weather.codes.${stats.weather_code}`, `Code ${stats.weather_code}`)
  const icon = WEATHER_ICONS[stats.weather_code] ?? '🌡️'
  const locationLabel = config.location_name || null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {locationLabel && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Cloud size={11} />
          {locationLabel}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 40, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)', lineHeight: 1 }}>
            {stats.temperature}{stats.unit}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{desc}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{t('weather.feels_like')}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{stats.apparent_temperature}{stats.unit}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{t('weather.humidity')}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{stats.humidity}%</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{t('weather.wind')}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{stats.wind_speed} km/h</span>
        </div>
        {stats.precipitation > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{t('weather.precipitation')}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{stats.precipitation} mm</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── AdGuard stats view (shared between WidgetCard and DashboardWidgetCard) ────
export function AdGuardStatsView({
  stats,
  isAdmin,
  toggling,
  onToggle,
}: {
  stats: AdGuardStats
  isAdmin: boolean
  toggling: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation('widgets')
  const isError = stats.total_queries === -1
  if (isError) {
    return <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>{t('adguard.unreachable')}</div>
  }
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
        <AdGuardStat label={t('adguard.total')} value={fmt(stats.total_queries)} />
        <AdGuardStat label={t('adguard.blocked')} value={fmt(stats.blocked_queries)} />
        <AdGuardStat label={t('adguard.rate')} value={`${stats.blocked_percent}%`} highlight />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {stats.protection_enabled
            ? <Shield size={13} style={{ color: 'var(--status-online)' }} />
            : <ShieldOff size={13} style={{ color: 'var(--text-muted)' }} />
          }
          <span style={{ fontSize: 12, color: stats.protection_enabled ? 'var(--status-online)' : 'var(--text-muted)' }}>
            {stats.protection_enabled ? t('adguard.protected') : t('adguard.paused')}
          </span>
        </div>
        {isAdmin && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onToggle}
            disabled={toggling}
            style={{ fontSize: 11, padding: '3px 10px', gap: 4 }}
          >
            {toggling
              ? <div className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
              : stats.protection_enabled ? <ShieldOff size={11} /> : <Shield size={11} />
            }
            {stats.protection_enabled ? t('adguard.pause') : t('adguard.enable')}
          </button>
        )}
      </div>
    </div>
  )
}

function AdGuardStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: highlight ? 'var(--accent)' : 'var(--text-primary)' }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
    </div>
  )
}

export function StatBar({ label, value, unit, extra }: { label: string; value: number | null; unit: string; extra?: string }) {
  const pct = value ?? 0
  const color = pct >= 90 ? 'var(--status-offline)' : pct >= 70 ? '#f59e0b' : 'var(--accent)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {value === null ? '—' : `${value}${unit}`}
          {extra && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{extra}</span>}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--glass-border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

// ── Nginx Proxy Manager stats view ───────────────────────────────────────────
export function NginxPMStatsView({ stats }: { stats: NpmStats & { error?: string } }) {
  const { t } = useTranslation('widgets')
  if (stats.error) {
    return <div style={{ fontSize: 12, color: 'var(--status-offline)', textAlign: 'center', padding: '8px 0' }}>Error: {stats.error}</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{stats.proxy_hosts}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('nginx.proxies')}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{stats.streams}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('nginx.streams')}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: stats.cert_expiring_soon > 0 ? '#f59e0b' : 'var(--accent)' }}>{stats.certificates}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('nginx.certs')}</div>
        </div>
      </div>
      {stats.cert_expiring_soon > 0 && (
        <div style={{ fontSize: 11, color: '#f59e0b', textAlign: 'center' }}>
          {stats.cert_expiring_soon !== 1
            ? t('nginx.cert_expiring_soon_plural', { count: stats.cert_expiring_soon })
            : t('nginx.cert_expiring_soon', { count: stats.cert_expiring_soon })}
        </div>
      )}
    </div>
  )
}

// ── Main Widgets page ─────────────────────────────────────────────────────────
interface Props {
  showAddForm: boolean
  onFormClose: () => void
}

export function WidgetsPage({ showAddForm, onFormClose }: Props) {
  const { t } = useTranslation('widgets')
  const { isAdmin } = useStore()
  const { widgets, loadWidgets, loadStats, createWidget, updateWidget, deleteWidget, startPollingAll, stopPollingAll } = useWidgetStore()
  const { isOnDashboard, addWidget, addArrInstance, removeByRef } = useDashboardStore()
  const { loadContainers: loadDockerContainers } = useDockerStore()
  const { confirm: confirmDlg } = useConfirm()
  const { instances } = useInstanceStore()
  const { loadAllStats: loadArrStats } = useArrStore()
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    loadWidgets().catch(() => {})
    useInstanceStore.getState().loadInstances().catch(() => {})
    loadArrStats().catch(() => {})
  }, [])

  const widgetIds = widgets.map(w => w.id).join(',')

  useEffect(() => {
    const statsPollable = widgets.filter(w => w.type !== 'docker_overview' && w.type !== 'custom_button' && w.type !== 'helbackup')
    const dockerPollable = widgets.filter(w => w.type === 'docker_overview')
    if (statsPollable.length === 0 && dockerPollable.length === 0) return
    Promise.all(statsPollable.map(w => loadStats(w.id))).catch(() => {})
    if (dockerPollable.length > 0) loadDockerContainers().catch(() => {})
    const allPollable = [...statsPollable, ...dockerPollable]
    startPollingAll(allPollable.map(w => ({ id: w.id, type: w.type })))
    return () => stopPollingAll()
  }, [widgetIds])

  const handleCreate = async (data: { name: string; type: string; config: object; display_location: 'topbar' | 'sidebar' | 'none'; iconId?: string | null; iconChanged?: boolean }) => {
    const { iconId, iconChanged, ...widgetData } = data
    const id = await createWidget({ ...widgetData, show_in_topbar: widgetData.display_location === 'topbar' })
    if (iconChanged) await updateWidget(id, { icon_id: iconId ?? null })
    onFormClose()
  }

  const handleUpdate = async (id: string, data: { name: string; type: string; config: object; display_location: 'topbar' | 'sidebar' | 'none'; iconId?: string | null; iconChanged?: boolean }) => {
    const { iconId, iconChanged, ...widgetData } = data
    await updateWidget(id, { ...widgetData, show_in_topbar: widgetData.display_location === 'topbar' })
    if (iconChanged) await updateWidget(id, { icon_id: iconId ?? null })
    setEditingId(null)
  }

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirmDlg({ title: t('delete_confirm_title', { name }), danger: true, confirmLabel: t('delete_confirm_btn') })
    if (!ok) return
    await deleteWidget(id)
  }

  const handleToggleArrDashboard = async (instanceId: string) => {
    if (isOnDashboard('arr_instance', instanceId)) {
      await removeByRef('arr_instance', instanceId)
    } else {
      await addArrInstance(instanceId)
    }
  }

  const handleToggleDashboard = async (widget: Widget) => {
    if (isOnDashboard('widget', widget.id)) {
      await removeByRef('widget', widget.id)
    } else {
      await addWidget(widget.id)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Add form */}
      {showAddForm && isAdmin && (
        <WidgetForm
          onSave={handleCreate}
          onCancel={onFormClose}
        />
      )}

      {widgets.length === 0 && !showAddForm && (
        <div className="empty-state">
          <div className="empty-state-icon">◈</div>
          <div className="empty-state-text">
            {isAdmin ? t('empty.admin') : t('empty.guest')}
          </div>
        </div>
      )}

      <div className="card-grid" style={{ gap: 16 }}>
        {widgets.map(widget => (
          editingId === widget.id
            ? (
              <WidgetForm
                key={widget.id}
                initial={widget}
                onSave={(data) => handleUpdate(widget.id, data)}
                onCancel={() => setEditingId(null)}
              />
            )
            : (
              <WidgetCard
                key={widget.id}
                widget={widget}
                onEdit={() => setEditingId(widget.id)}
                onDelete={() => handleDelete(widget.id, widget.name)}
                onToggleDashboard={() => handleToggleDashboard(widget)}
                isOnDashboard={isOnDashboard('widget', widget.id)}
              />
            )
        ))}
      </div>

      {/* Instances section — Arr types only */}
      {instances.filter(i => i.enabled && ['radarr', 'sonarr', 'prowlarr', 'sabnzbd', 'seerr'].includes(i.type)).length > 0 && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 12, paddingBottom: 8,
            borderBottom: '1px solid var(--glass-border)',
          }}>
            <LayoutGrid size={14} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t('arr_section_title')}</h3>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              ({instances.filter(i => i.enabled && ['radarr', 'sonarr', 'prowlarr', 'sabnzbd', 'seerr'].includes(i.type)).length})
            </span>
          </div>
          <div className="card-grid" style={{ gap: 14 }}>
            {instances.filter(i => i.enabled && ['radarr', 'sonarr', 'prowlarr', 'sabnzbd', 'seerr'].includes(i.type)).map(instance => {
              const onDashboard = isOnDashboard('arr_instance', instance.id)
              const dashBtn = isAdmin && (
                <button
                  className={onDashboard ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                  onClick={() => handleToggleArrDashboard(instance.id)}
                  style={{ gap: 4, fontSize: 12, alignSelf: 'flex-start' }}
                >
                  <LayoutDashboard size={12} />
                  {onDashboard ? t('dashboard_toggle.on') : t('dashboard_toggle.add')}
                </button>
              )
              if (instance.type === 'sabnzbd') {
                return (
                  <div key={instance.id} className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <SabnzbdCardContent instance={instance} />
                    {dashBtn}
                  </div>
                )
              }
              if (instance.type === 'seerr') {
                return (
                  <div key={instance.id} className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <SeerrCardContent instance={instance} />
                    {dashBtn}
                  </div>
                )
              }
              if (['radarr', 'sonarr', 'prowlarr'].includes(instance.type)) {
                return (
                  <div key={instance.id} className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <ArrCardContent instance={instance} />
                    {dashBtn}
                  </div>
                )
              }
              // HA and Unraid: simple info card
              const color = (ARR_TYPE_COLORS as Record<string, string>)[instance.type] ?? 'var(--accent)'
              return (
                <div key={instance.id} className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}22`, border: `1px solid ${color}44` }}>
                      {(() => {
                        const iconUrl = getIconUrl(instance)
                        return iconUrl ? (
                          <img src={iconUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
                            {instance.type.slice(0, 3).toUpperCase()}
                          </span>
                        )
                      })()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{instance.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{instance.url}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
