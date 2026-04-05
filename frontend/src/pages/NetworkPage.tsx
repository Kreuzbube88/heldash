import React, { useEffect, useState } from 'react'
import { Plus, Wifi, WifiOff, Zap, Edit2, Trash2, Search, X, ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api, getIconUrl } from '../api'
import { useStore } from '../store/useStore'
import { useLanguageStore } from '../store/useLanguageStore'
import { useToast } from '../components/Toast'
import { IconPicker } from '../components/IconPicker'
import type { NetworkDevice, NetworkDeviceHistory, ScanResult } from '../types'

// ── Add/Edit Device Modal ─────────────────────────────────────────────────────

interface DeviceModalProps {
  device?: NetworkDevice | null
  existingGroups: string[]
  onClose: () => void
  onSave: (data: Partial<NetworkDevice>) => Promise<void>
}

function DeviceModal({ device, existingGroups, onClose, onSave }: DeviceModalProps) {
  const { t } = useTranslation('network')
  const [name, setName] = useState(device?.name ?? '')
  const [ip, setIp] = useState(device?.ip ?? '')
  const [icon, setIcon] = useState(device?.icon ?? '🖥️')
  const [iconId, setIconId] = useState<string | null>(device?.icon_id ?? null)
  const [groupName, setGroupName] = useState(device?.group_name ?? '')
  const [checkPort, setCheckPort] = useState(device?.check_port ? String(device.check_port) : '')
  const [useCustomPort, setUseCustomPort] = useState(!!device?.check_port)
  const [wolEnabled, setWolEnabled] = useState(device?.wol_enabled ?? false)
  const [mac, setMac] = useState(device?.mac ?? '')
  const [wolBroadcast, setWolBroadcast] = useState(device?.wol_broadcast ?? '')
  const [subnet, setSubnet] = useState(device?.subnet ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false)

  const ICONS = ['🖥️', '💻', '📱', '📡', '🖨️', '📺', '🎮', '🔌', '📷', '🎵', '🏠', '⚡', '🌐', '🔒', '🗄️']

  const handleSave = async () => {
    if (!name.trim() || !ip.trim()) {
      setError(t('device.name_ip_required'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        ip: ip.trim(),
        icon,
        icon_id: iconId ?? undefined,
        group_name: groupName.trim() || null,
        check_port: useCustomPort && checkPort ? parseInt(checkPort, 10) : null,
        wol_enabled: wolEnabled,
        mac: wolEnabled ? mac.trim() || null : null,
        wol_broadcast: wolEnabled ? wolBroadcast.trim() || null : null,
        subnet: subnet.trim() || null,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('device.save_error'))
    } finally {
      setSaving(false)
    }
  }

  const filteredGroups = existingGroups.filter(g => g.toLowerCase().includes(groupName.toLowerCase()) && g !== groupName)

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="glass modal" style={{ width: '100%', maxWidth: 520, padding: 24, borderRadius: 'var(--radius-xl)' }}>
        <h3 style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)' }}>{device?.id ? t('device.edit') : t('device.add')}</h3>

        {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">{t('device.name')}</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={t('device.name_placeholder')} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">{t('device.ip')}</label>
              <input className="input" value={ip} onChange={e => setIp(e.target.value)} placeholder={t('device.ip_placeholder')} />
            </div>
          </div>

          <div>
            <label className="field-label">{t('device.icon_library')}</label>
            <IconPicker
              iconId={iconId}
              iconUrl={null}
              onChange={id => setIconId(id)}
            />
          </div>

          <div>
            <label className="field-label">{t('device.icon_emoji')}</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ICONS.map(i => (
                <button
                  key={i}
                  onClick={() => setIcon(i)}
                  style={{
                    padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                    border: icon === i ? '2px solid var(--accent)' : '2px solid transparent',
                    background: icon === i ? 'var(--accent-subtle)' : 'var(--glass-bg)',
                    cursor: 'pointer', fontSize: 18,
                  }}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <label className="field-label">{t('device.group')}</label>
            <input
              className="input"
              value={groupName}
              onChange={e => { setGroupName(e.target.value); setShowGroupSuggestions(true) }}
              placeholder={t('device.group_placeholder')}
              onFocus={() => setShowGroupSuggestions(true)}
              onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 150)}
            />
            {showGroupSuggestions && filteredGroups.length > 0 && (
              <div className="glass" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, borderRadius: 'var(--radius-sm)', marginTop: 4 }}>
                {filteredGroups.map(g => (
                  <button
                    key={g}
                    onClick={() => { setGroupName(g); setShowGroupSuggestions(false) }}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)', fontSize: 13 }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="field-label">{t('device.subnet')}</label>
            <input className="input" value={subnet} onChange={e => setSubnet(e.target.value)} placeholder={t('device.subnet_placeholder')} />
          </div>

          <div>
            <label className="field-label">{t('device.check_method')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setUseCustomPort(false)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: !useCustomPort ? '2px solid var(--accent)' : '2px solid var(--glass-border)', background: !useCustomPort ? 'var(--accent-subtle)' : 'var(--glass-bg)', cursor: 'pointer', fontSize: 13 }}
              >
                {t('device.check_standard')}
              </button>
              <button
                onClick={() => setUseCustomPort(true)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: useCustomPort ? '2px solid var(--accent)' : '2px solid var(--glass-border)', background: useCustomPort ? 'var(--accent-subtle)' : 'var(--glass-bg)', cursor: 'pointer', fontSize: 13 }}
              >
                {t('device.check_tcp')}
              </button>
            </div>
            {useCustomPort && (
              <input className="input" style={{ marginTop: 8 }} value={checkPort} onChange={e => setCheckPort(e.target.value)} placeholder={t('device.port_placeholder')} type="number" min="1" max="65535" />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="field-label" style={{ margin: 0 }}>{t('device.wol')}</label>
              <button
                onClick={() => setWolEnabled(v => !v)}
                style={{ width: 40, height: 22, borderRadius: 11, background: wolEnabled ? 'var(--accent)' : 'var(--glass-border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 200ms' }}
              >
                <span style={{ position: 'absolute', top: 2, left: wolEnabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 200ms' }} />
              </button>
            </div>
            {wolEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <div>
                  <label className="field-label">{t('device.mac')}</label>
                  <input className="input" value={mac} onChange={e => setMac(e.target.value)} placeholder={t('device.mac_placeholder')} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>{t('device.mac_format')}</span>
                </div>
                <div>
                  <label className="field-label">{t('device.broadcast')}</label>
                  <input className="input" value={wolBroadcast} onChange={e => setWolBroadcast(e.target.value)} placeholder={t('device.broadcast_placeholder')} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>{t('device.cancel')}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? t('device.saving') : t('device.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── IP Scanner Modal ──────────────────────────────────────────────────────────

interface ScannerModalProps {
  defaultSubnet: string
  existingIps: string[]
  onClose: () => void
  onAddDevice: (ip: string, ports: number[]) => void
}

function ScannerModal({ defaultSubnet, existingIps, onClose, onAddDevice }: ScannerModalProps) {
  const { t } = useTranslation('network')
  const [subnet, setSubnet] = useState(defaultSubnet)
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<ScanResult[]>([])
  const [scanned, setScanned] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addedIps, setAddedIps] = useState<string[]>([])

  const isValidSubnet = (s: string) =>
    /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s) ||
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(s)

  const handleScan = async () => {
    if (!subnet.trim()) { setError(t('scanner.enter_subnet')); return }
    if (!isValidSubnet(subnet.trim())) { setError(t('scanner.invalid_format')); return }
    setScanning(true)
    setError(null)
    setResults([])
    setAddedIps([])
    try {
      const data = await api.network.scan(subnet.trim())
      setResults(data)
      setScanned(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('scanner.scan_failed'))
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="glass modal" style={{ width: '100%', maxWidth: 640, padding: 24, borderRadius: 'var(--radius-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>{t('scanner.title')}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <input className="input" style={{ flex: 1 }} value={subnet} onChange={e => setSubnet(e.target.value)} placeholder={t('scanner.subnet_placeholder')} />
          <button className="btn btn-primary" onClick={handleScan} disabled={scanning}>
            {scanning ? t('scanner.scanning') : t('scanner.scan')}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, marginTop: 0 }}>{t('scanner.hint')}</p>

        {!scanned && !error && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 0 }}>{t('scanner.duration')}</p>}
        {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

        {scanned && !scanning && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{results.length !== 1 ? t('scanner.found_plural', { count: results.length }) : t('scanner.found_single', { count: results.length })}</p>
            {results.length > 0 && (
              <>
                <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {results.map(r => {
                    const exists = existingIps.includes(r.ip) || addedIps.includes(r.ip)
                    return (
                      <div key={r.ip} className="glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--radius-sm)', opacity: exists ? 0.6 : 1 }}>
                        <div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{r.ip}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>Ports: {r.open_ports.join(', ')} · {r.latency}ms</span>
                        </div>
                        {exists ? (
                          <span style={{ fontSize: 12, color: 'var(--status-online)', display: 'flex', alignItems: 'center', gap: 4 }}>✓ {existingIps.includes(r.ip) ? t('scanner.existing') : t('scanner.added')}</span>
                        ) : (
                          <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => { setAddedIps(prev => [...prev, r.ip]); onAddDevice(r.ip, r.open_ports) }}>{t('scanner.add')}</button>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: 13 }}>{t('scanner.finish')}</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Device Card ───────────────────────────────────────────────────────────────

interface DeviceCardProps {
  device: NetworkDevice
  isAdmin: boolean
  onEdit: () => void
  onDelete: () => void
  onWol: () => Promise<void>
}

function DeviceCard({ device, isAdmin, onEdit, onDelete, onWol }: DeviceCardProps) {
  const { t } = useTranslation('network')
  const [expanded, setExpanded] = useState(false)
  const [history, setHistory] = useState<NetworkDeviceHistory[]>([])
  const { language } = useLanguageStore()
  const dateLocale = language === 'de' ? 'de-DE' : 'en-US'
  const [wolLoading, setWolLoading] = useState(false)
  const { toast } = useToast()

  const loadHistory = async () => {
    if (expanded) { setExpanded(false); return }
    try {
      const data = await api.network.history(device.id)
      setHistory(data)
    } catch { setHistory([]) }
    setExpanded(true)
  }

  const handleWol = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setWolLoading(true)
    try {
      await onWol()
    } finally {
      setWolLoading(false)
    }
  }

  const statusColor = device.last_status === 'online' ? 'var(--status-online)' : device.last_status === 'offline' ? 'var(--status-offline)' : 'var(--text-muted)'

  const lastCheckedStr = (() => {
    if (!device.last_checked) return t('card.never_checked')
    const d = new Date(device.last_checked.endsWith('Z') ? device.last_checked : device.last_checked + 'Z')
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60) return t('card.just_now')
    if (diff < 3600) return t('card.minutes_ago', { count: Math.floor(diff / 60) })
    if (diff < 86400) return t('card.hours_ago', { count: Math.floor(diff / 3600) })
    return t('card.days_ago', { count: Math.floor(diff / 86400) })
  })()

  return (
    <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div
        onClick={loadHistory}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', position: 'relative' }}
      >
        {(() => {
          const iconUrl = getIconUrl(device)
          if (iconUrl) return <img src={iconUrl} alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }} />
          return <span style={{ fontSize: 24, flexShrink: 0 }}>{device.icon}</span>
        })()}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{device.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{device.ip}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {device.last_status && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: statusColor }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0, display: 'block' }} />
              {device.last_status === 'online' ? t('status.online') : t('status.offline')}
            </div>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lastCheckedStr}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {device.wol_enabled && (
            <button
              className="btn-icon"
              onClick={handleWol}
              disabled={wolLoading}
              title={t('card.wol_title')}
              style={{ color: 'var(--accent)' }}
            >
              <Zap size={14} />
            </button>
          )}
          {isAdmin && (
            <>
              <button className="btn-icon" onClick={e => { e.stopPropagation(); onEdit() }} title={t('card.edit_title')}><Edit2 size={14} /></button>
              <button className="btn-icon" onClick={e => { e.stopPropagation(); onDelete() }} title={t('card.delete_title')} style={{ color: 'var(--status-offline)' }}><Trash2 size={14} /></button>
            </>
          )}
        </div>
      </div>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--glass-border)', padding: '12px 16px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{t('card.last_checks')}</div>
          {history.length === 0 ? (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('card.no_history')}</span>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 2, marginBottom: 10, flexWrap: 'wrap' }}>
                {history.slice(0, 48).reverse().map((h, i) => (
                  <div
                    key={i}
                    style={{ width: 8, height: 16, borderRadius: 2, background: h.status === 'online' ? 'var(--status-online)' : 'var(--status-offline)', opacity: 0.85 }}
                    title={`${h.checked_at}: ${h.status}`}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {history.slice(0, 5).map((h, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: h.status === 'online' ? 'var(--status-online)' : 'var(--status-offline)' }}>
                      {h.status === 'online' ? `● ${t('status.online')}` : `● ${t('status.offline')}`}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {new Date(h.checked_at.endsWith('Z') ? h.checked_at : h.checked_at + 'Z').toLocaleString(dateLocale, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main NetworkPage ───────────────────────────────────────────────────────────

export function NetworkPage() {
  const { t } = useTranslation('network')
  const { isAdmin } = useStore()
  const [devices, setDevices] = useState<NetworkDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [editDevice, setEditDevice] = useState<NetworkDevice | null>(null)
  const [prefilledIp, setPrefilledIp] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const loadDevices = async () => {
    try {
      const data = await api.network.devices.list()
      setDevices(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('messages.load_error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDevices() }, [])

  useEffect(() => {
    const interval = setInterval(() => loadDevices(), 60_000)
    return () => clearInterval(interval)
  }, [])

  const handleSave = async (data: Partial<NetworkDevice>) => {
    if (editDevice) {
      await api.network.devices.update(editDevice.id, data)
    } else {
      await api.network.devices.create(data)
    }
    await loadDevices()
  }

  const handleDelete = async (device: NetworkDevice) => {
    try {
      await api.network.devices.delete(device.id)
      await loadDevices()
      toast({ message: t('messages.device_removed', { name: device.name }), type: 'info' })
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : t('messages.error'), type: 'error' })
    }
  }

  const handleWol = async (device: NetworkDevice) => {
    try {
      await api.network.wol(device.id)
      toast({ message: t('messages.wol_sent', { name: device.name }), type: 'success' })
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : t('messages.wol_failed'), type: 'error' })
    }
  }

  const handleAddFromScan = (ip: string, _ports: number[]) => {
    setPrefilledIp(ip)
    setShowAddModal(true)
  }

  const onlineCount = devices.filter(d => d.last_status === 'online').length
  const offlineCount = devices.filter(d => d.last_status === 'offline').length
  const existingGroups = [...new Set(devices.map(d => d.group_name).filter(Boolean) as string[])]
  const defaultSubnet = devices.find(d => d.subnet)?.subnet ?? ''
  const existingIps = devices.map(d => d.ip)

  const groupMap = new Map<string, NetworkDevice[]>()
  for (const device of devices) {
    const key = device.group_name ?? '__ungrouped__'
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(device)
  }
  const sortedGroups = [...groupMap.keys()].sort((a, b) => {
    if (a === '__ungrouped__') return 1
    if (b === '__ungrouped__') return -1
    return a.localeCompare(b)
  })

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>{t('title')}</h2>
          {error && <div className="error-banner" style={{ marginTop: 8 }}>{error}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowScanner(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={14} /> {t('buttons.scan_network')}
          </button>
          {isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => { setEditDevice(null); setPrefilledIp(null); setShowAddModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} /> {t('device.add')}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: t('stats.online', { count: onlineCount }), color: 'var(--status-online)', icon: <Wifi size={14} /> },
          { label: t('stats.offline', { count: offlineCount }), color: 'var(--status-offline)', icon: <WifiOff size={14} /> },
          { label: t('stats.total', { count: devices.length }), color: 'var(--text-secondary)', icon: null },
        ].map(stat => (
          <div key={stat.label} className="glass" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 'var(--radius-md)', color: stat.color, fontSize: 13, fontWeight: 500 }}>
            {stat.icon}
            {stat.label}
          </div>
        ))}
      </div>

      {devices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌐</div>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>{t('empty.title')}</h3>
          <p style={{ marginBottom: 20 }}>{t('empty.description')}</p>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>{t('empty.add_first')}</button>
          )}
        </div>
      ) : (
        sortedGroups.map(groupKey => {
          const groupDevices = groupMap.get(groupKey) ?? []
          const label = groupKey === '__ungrouped__' ? t('labels.ungrouped') : groupKey
          const collapsed = collapsedGroups.has(groupKey)
          return (
            <div key={groupKey}>
              <button
                onClick={() => toggleGroup(groupKey)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 8, color: 'var(--text-secondary)', fontWeight: 500, fontSize: 13 }}
              >
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                {label}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({groupDevices.length})</span>
              </button>
              {!collapsed && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                  {groupDevices.map(device => (
                    <DeviceCard
                      key={device.id}
                      device={device}
                      isAdmin={isAdmin}
                      onEdit={() => { setEditDevice(device); setShowAddModal(true) }}
                      onDelete={() => handleDelete(device)}
                      onWol={() => handleWol(device)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}

      {showScanner && (
        <ScannerModal
          defaultSubnet={defaultSubnet}
          existingIps={existingIps}
          onClose={() => setShowScanner(false)}
          onAddDevice={handleAddFromScan}
        />
      )}
      {showAddModal && (
        <DeviceModal
          device={editDevice ?? (prefilledIp ? { ip: prefilledIp } as NetworkDevice : null)}
          existingGroups={existingGroups}
          onClose={() => { setShowAddModal(false); setEditDevice(null); setPrefilledIp(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
