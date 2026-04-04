import React, { useEffect, useState } from 'react'
import { Sun, Moon, RefreshCw, Plus, LogIn, LogOut, Pencil, LayoutGrid, LayoutList, Minus, Users, MoreVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLanguageStore } from '../store/useLanguageStore'
import { useStore } from '../store/useStore'
import { useDashboardStore } from '../store/useDashboardStore'
import { useWidgetStore } from '../store/useWidgetStore'
import { useDockerStore } from '../store/useDockerStore'
import { api } from '../api'
import type { ThemeAccent, ServerStats, AdGuardStats, HaEntityState, NpmStats, CalendarEntry, WeatherStats } from '../types'
import { containerCounts } from '../utils'

interface Props {
  page: string
  onAddService: () => void
  onAddInstance: () => void
  onAddWidget: () => void
  onCheckAll: () => void
  checking: boolean
  onLogin: () => void
}

const ACCENTS: { value: ThemeAccent; label: string; color: string }[] = [
  { value: 'cyan', label: 'Cyan', color: '#22d3ee' },
  { value: 'orange', label: 'Orange', color: '#fb923c' },
  { value: 'magenta', label: 'Magenta', color: '#e879f9' },
]

export function Topbar({ page, onAddService, onAddInstance, onAddWidget, onCheckAll, checking, onLogin }: Props) {
  const { t } = useTranslation('common')
  const { language } = useLanguageStore()
  const dateLocale = language === 'de' ? 'de-DE' : 'en-US'
  const { settings, setThemeMode, setThemeAccent, isAuthenticated, isAdmin, authUser, logout, loadAll } = useStore()
  const { loadDashboard, editMode, setEditMode, addPlaceholder, guestMode, setGuestMode } = useDashboardStore()
  const { widgets, stats, loadWidgets, loadStats, startPolling, stopPolling } = useWidgetStore()
  const { containers, loadContainers } = useDockerStore()
  const mode = settings?.theme_mode ?? 'dark'
  const accent = settings?.theme_accent ?? 'cyan'
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Users in grp_guest (or no group) cannot edit the dashboard
  const isGuestUser = !isAdmin && (!authUser?.groupId || authUser.groupId === 'grp_guest')
  const canEditDashboard = isAuthenticated && !isGuestUser

  const topbarWidgets = widgets.filter(w => w.display_location === 'topbar')
  const hasDockerTopbar = topbarWidgets.some(w => w.type === 'docker_overview')
  const statsWidgetKey = topbarWidgets.filter(w => w.type !== 'docker_overview').map(w => w.id).join(',')

  // Server clock: fetch server time once, compute offset, tick every second
  const [serverOffset, setServerOffset] = useState(0)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    api.serverTime().then(({ iso }) => {
      setServerOffset(new Date(iso).getTime() - Date.now())
    }).catch(() => {})
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  const serverNow = new Date(now.getTime() + serverOffset)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  // Re-load widgets whenever auth state changes so backend permission filtering is applied
  useEffect(() => {
    loadWidgets().catch(() => {})
  }, [isAuthenticated, authUser?.id])

  // Poll stats for topbar widgets
  useEffect(() => {
    if (!statsWidgetKey) return
    const pollable = topbarWidgets.filter(w => w.type !== 'docker_overview' && w.type !== 'custom_button')
    pollable.forEach(w => { loadStats(w.id).catch(() => {}); startPolling(w.id, w.type) })
    return () => pollable.forEach(w => stopPolling(w.id))
  }, [statsWidgetKey])

  // Poll container list for docker_overview topbar widgets
  useEffect(() => {
    if (!hasDockerTopbar) return
    loadContainers().catch(() => {})
    const interval = setInterval(() => loadContainers().catch(() => {}), 30_000)
    return () => clearInterval(interval)
  }, [hasDockerTopbar])

  return (
    <header className="topbar">
      <div className="topbar-title">
        <span>{serverNow.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <span style={{ marginLeft: 10, fontVariantNumeric: 'tabular-nums' }}>
          {serverNow.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      {/* Center zone — topbar widget stats */}
      <div className="topbar-center">
        {topbarWidgets.map(w => {
          const pillStyle: React.CSSProperties = {
            display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-md)',
            padding: '4px 12px',
            background: 'rgba(var(--accent-rgb), 0.06)',
            boxShadow: '0 0 8px rgba(var(--accent-rgb), 0.25)',
            fontSize: 12,
            flexShrink: 0,
          }
          const label = (text: string) => (
            <span style={{ color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.3px', marginRight: 2 }}>{text}</span>
          )
          const sep = <span style={{ color: 'var(--glass-border)', userSelect: 'none' }}>·</span>
          const val = (text: string, color?: string) => (
            <span style={{ color: color ?? 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600, whiteSpace: 'nowrap' }}>{text}</span>
          )
          const muted = (text: string) => (
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{text}</span>
          )
          const pctColor = (pct: number) =>
            pct >= 90 ? 'var(--status-offline)' : pct >= 70 ? '#f59e0b' : 'var(--status-online)'

          if (w.type === 'docker_overview') {
            const { running, stopped, restarting } = containerCounts(containers)
            return (
              <div key={w.id} style={pillStyle}>
                {label('Docker:')}
                {val(String(containers.length))} {muted('total')}
                {sep}
                {val(String(running), 'var(--status-online)')} {muted('running')}
                {stopped > 0 && <>{sep}{val(String(stopped), 'var(--text-muted)')} {muted('stopped')}</>}
                {restarting > 0 && <>{sep}{val(String(restarting), '#f59e0b')} {muted('restarting')}</>}
              </div>
            )
          }

          if (w.type === 'adguard_home') {
            const s = stats[w.id] as AdGuardStats | undefined
            if (!s) return null
            const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
            const isErr = s.total_queries === -1
            return (
              <div key={w.id} style={pillStyle}>
                {label('AdGuard:')}
                {isErr
                  ? muted(t('status.unreachable'))
                  : <>
                      {val(fmt(s.total_queries))} {muted(t('docker_widget.req'))}
                      {sep}
                      {val(fmt(s.blocked_queries), 'var(--status-offline)')} {muted(`${t('docker_widget.blocked')} (${s.blocked_percent}%)`)}
                      {sep}
                      <span style={{ color: s.protection_enabled ? 'var(--status-online)' : '#f59e0b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {s.protection_enabled ? `● ${t('status.protected')}` : `● ${t('status.paused')}`}
                      </span>
                    </>
                }
              </div>
            )
          }

          if (w.type === 'home_assistant') {
            const entities = Array.isArray(stats[w.id]) ? stats[w.id] as unknown as HaEntityState[] : []
            if (entities.length === 0) return null
            return (
              <div key={w.id} style={pillStyle}>
                {label(`${w.name}:`)}
                {entities.map((e, i) => (
                  <React.Fragment key={e.entity_id}>
                    {i > 0 && sep}
                    {muted(e.label || e.friendly_name || e.entity_id)}{' '}
                    {val(
                      e.state + (e.unit ? ` ${e.unit}` : ''),
                    ['on', 'open', 'unlocked', 'playing', 'home', 'active'].includes(e.state) ? 'var(--status-online)'
                      : ['off', 'closed', 'locked', 'paused', 'idle', 'standby'].includes(e.state) ? 'var(--text-muted)'
                      : undefined
                    )}
                  </React.Fragment>
                ))}
              </div>
            )
          }

          if (w.type === 'nginx_pm') {
            const npm = stats[w.id] as unknown as NpmStats & { error?: string }
            if (!npm || npm.error) return null
            return (
              <div key={w.id} style={pillStyle}>
                {label('NPM:')}
                {val(String(npm.proxy_hosts))} {muted(t('docker_widget.proxies'))}
                {sep}
                {val(String(npm.streams))} {muted(t('docker_widget.streams'))}
                {sep}
                {val(String(npm.certificates), npm.cert_expiring_soon > 0 ? '#f59e0b' : undefined)} {muted(t('docker_widget.certs'))}
                {npm.cert_expiring_soon > 0 && <>{sep}{val(String(npm.cert_expiring_soon), '#f59e0b')} {muted(t('docker_widget.expiring_soon'))}</>}
              </div>
            )
          }

          if (w.type === 'pihole') {
            const p = stats[w.id] as unknown as AdGuardStats
            if (!p) return null
            const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
            const isErr = p.total_queries === -1
            return (
              <div key={w.id} style={pillStyle}>
                {label('Pi-hole:')}
                {isErr
                  ? muted(t('status.unreachable'))
                  : <>
                      {val(fmt(p.total_queries))} {muted(t('docker_widget.req'))}
                      {sep}
                      {val(fmt(p.blocked_queries), 'var(--status-offline)')} {muted(`${t('docker_widget.blocked')} (${p.blocked_percent}%)`)}
                    </>
                }
              </div>
            )
          }

          if (w.type === 'calendar') {
            const entries = Array.isArray(stats[w.id]) ? stats[w.id] as unknown as CalendarEntry[] : []
            const upcoming = entries.slice(0, 3)
            if (upcoming.length === 0) return null
            const fmtDate = (d: string) => {
              const today = new Date(); today.setHours(0, 0, 0, 0)
              const dd = new Date(d + 'T00:00:00')
              if (dd.getTime() === today.getTime()) return t('topbar.today')
              return dd.toLocaleDateString(dateLocale, { weekday: 'short', month: 'short', day: 'numeric' })
            }
            return (
              <div key={w.id} style={pillStyle}>
                {label('Cal:')}
                {upcoming.map((e, i) => (
                  <React.Fragment key={e.id}>
                    {i > 0 && sep}
                    {muted(fmtDate(e.date))}{' '}
                    {val(e.title + (e.type === 'episode' && e.season_number != null ? ` S${String(e.season_number).padStart(2,'0')}E${String(e.episode_number ?? 0).padStart(2,'0')}` : ''))}
                  </React.Fragment>
                ))}
                {entries.length > 3 && <>{sep}{muted(t('time.more', { count: entries.length - 3 }))}</>}
              </div>
            )
          }

          if (w.type === 'weather') {
            const weather = stats[w.id] as WeatherStats | undefined
            if (!weather || weather.error) return null
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
            const weatherIcon = WEATHER_ICONS[weather.weather_code] ?? '🌡️'
            return (
              <div key={w.id} style={pillStyle}>
                {label(`${w.name}:`)}
                <span style={{ fontSize: 14 }}>{weatherIcon}</span>
                {val(`${weather.temperature}${weather.unit}`, 'var(--accent)')}
                {sep}
                {muted(t('docker_widget.feels'))} {val(`${weather.apparent_temperature}${weather.unit}`)}
                {sep}
                {muted(t('docker_widget.humid'))} {val(`${weather.humidity}%`)}
              </div>
            )
          }

          // server_status
          if (w.type !== 'server_status') return null
          const s = stats[w.id] as ServerStats | undefined
          if (!s) return null
          return (
            <div key={w.id} style={pillStyle}>
              {label(`${w.name}:`)}
              {s.cpu.load >= 0 && <>
                {muted('CPU')} {val(`${s.cpu.load}%`, pctColor(s.cpu.load))}
              </>}
              {s.ram.total > 0 && <>
                {sep}
                {muted('RAM')} {val(`${(s.ram.used / 1024).toFixed(1)}`, pctColor(Math.round(s.ram.used / s.ram.total * 100)))}
                <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>/{(s.ram.total / 1024).toFixed(1)} GB</span>
              </>}
              {s.disks.filter(d => d.total > 0).map(d => {
                const pct = Math.round((d.used / d.total) * 100)
                return (
                  <React.Fragment key={d.path}>
                    {sep}
                    {muted(d.name)} {val(`${pct}%`, pctColor(pct))}
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>· {(d.used / 1024).toFixed(0)}/{(d.total / 1024).toFixed(0)} GB</span>
                  </React.Fragment>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="topbar-actions">
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              background: dropdownOpen ? 'var(--accent-subtle)' : undefined,
              color: dropdownOpen ? 'var(--accent)' : undefined,
            }}
          >
            <MoreVertical size={18} />
          </button>

          {dropdownOpen && (
            <div className="topbar-dropdown">
              {/* Theme Section */}
              <div className="topbar-dropdown-section">
                <div className="topbar-dropdown-label">{t('topbar.theme')}</div>

                <div className="topbar-dropdown-item" style={{ paddingTop: 8, paddingBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('topbar.accent')}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {ACCENTS.map(a => (
                      <button
                        key={a.value}
                        onClick={() => setThemeAccent(a.value)}
                        style={{
                          width: 20, height: 20,
                          borderRadius: '50%',
                          background: a.color,
                          border: accent === a.value ? `2px solid white` : '2px solid transparent',
                          cursor: 'pointer',
                          outline: accent === a.value ? `2px solid ${a.color}` : 'none',
                          outlineOffset: 1,
                          transition: 'all 150ms ease',
                          boxShadow: accent === a.value ? `0 0 12px ${a.color}` : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  className="topbar-dropdown-item"
                  onClick={() => setThemeMode(mode === 'dark' ? 'light' : 'dark')}
                >
                  {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{mode === 'dark' ? t('topbar.light_mode') : t('topbar.dark_mode')}</span>
                </button>
              </div>

              {/* Actions Section */}
              <div className="topbar-dropdown-section">
                <div className="topbar-dropdown-label">{t('topbar.actions')}</div>

                <button
                  className="topbar-dropdown-item"
                  onClick={() => { onCheckAll(); setDropdownOpen(false) }}
                  disabled={checking}
                >
                  {checking
                    ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    : <RefreshCw size={16} />
                  }
                  <span>{t('topbar.check_all_apps')}</span>
                </button>

                {page === 'dashboard' && (
                  <>
                    {isAdmin && (
                      <button
                        className="topbar-dropdown-item"
                        onClick={() => { setGuestMode(!guestMode); setDropdownOpen(false) }}
                        style={{
                          background: guestMode ? 'var(--accent-subtle)' : undefined,
                          color: guestMode ? 'var(--accent)' : undefined,
                        }}
                      >
                        <Users size={16} />
                        <span>{guestMode ? t('topbar.exit_guest_mode') : t('topbar.edit_guest_dashboard')}</span>
                      </button>
                    )}

                    {canEditDashboard && (
                      <>
                        <button
                          className="topbar-dropdown-item"
                          onClick={() => { setEditMode(!editMode); setDropdownOpen(false) }}
                          style={{
                            background: editMode ? 'var(--accent-subtle)' : undefined,
                            color: editMode ? 'var(--accent)' : undefined,
                          }}
                        >
                          <Pencil size={16} />
                          <span>{editMode ? t('buttons.done') : t('topbar.edit_dashboard')}</span>
                        </button>

                        {editMode && (
                          <>
                            <button
                              className="topbar-dropdown-item"
                              onClick={() => { addPlaceholder('app'); setDropdownOpen(false) }}
                            >
                              <LayoutGrid size={16} />
                              <span>{t('topbar_edit.app')}</span>
                            </button>
                            <button
                              className="topbar-dropdown-item"
                              onClick={() => { addPlaceholder('widget'); setDropdownOpen(false) }}
                            >
                              <LayoutList size={16} />
                              <span>Widget</span>
                            </button>
                            <button
                              className="topbar-dropdown-item"
                              onClick={() => { addPlaceholder('row'); setDropdownOpen(false) }}
                            >
                              <Minus size={16} />
                              <span>{t('topbar_edit.row')}</span>
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}

                {isAdmin && page === 'media' && (
                  <button
                    className="topbar-dropdown-item"
                    onClick={() => { onAddInstance(); setDropdownOpen(false) }}
                  >
                    <Plus size={16} />
                    <span>{t('topbar.add_instance')}</span>
                  </button>
                )}
                {isAdmin && page === 'widgets' && (
                  <button
                    className="topbar-dropdown-item"
                    onClick={() => { onAddWidget(); setDropdownOpen(false) }}
                  >
                    <Plus size={16} />
                    <span>{t('topbar.add_widget')}</span>
                  </button>
                )}
                {isAdmin && page === 'services' && (
                  <button
                    className="topbar-dropdown-item"
                    onClick={() => { onAddService(); setDropdownOpen(false) }}
                  >
                    <Plus size={16} />
                    <span>{t('topbar.add_app')}</span>
                  </button>
                )}
              </div>

              {/* Account Section */}
              <div className="topbar-dropdown-section">
                <div className="topbar-dropdown-label">{t('topbar.account')}</div>
                {isAuthenticated ? (
                  <>
                    <div className="topbar-dropdown-item" style={{ cursor: 'default', opacity: 0.7 }}>
                      <Users size={16} />
                      <span>{authUser?.username}</span>
                    </div>
                    <button
                      className="topbar-dropdown-item"
                      onClick={async () => {
                        if (guestMode) await setGuestMode(false)
                        await logout()
                        await Promise.all([loadAll(), loadDashboard()])
                        setDropdownOpen(false)
                      }}
                    >
                      <LogOut size={16} />
                      <span>{t('topbar.logout')}</span>
                    </button>
                  </>
                ) : (
                  <button
                    className="topbar-dropdown-item"
                    onClick={() => { onLogin(); setDropdownOpen(false) }}
                  >
                    <LogIn size={16} />
                    <span>{t('buttons.login')}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
