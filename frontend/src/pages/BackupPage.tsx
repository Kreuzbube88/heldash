import React, { useEffect, useState } from 'react'
import { Plus, RefreshCw, Download, Trash2, Edit2, CheckCircle, XCircle, AlertTriangle, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { useStore } from '../store/useStore'
import { useLanguageStore } from '../store/useLanguageStore'
import { useToast } from '../components/Toast'
import type { BackupSource, BackupStatusResult } from '../types'

// ── Backup type definitions ───────────────────────────────────────────────────

const BACKUP_TYPE_VALUES = ['ca_backup', 'duplicati', 'kopia', 'docker', 'vm'] as const

function useBackupTypes(t: (key: string) => string) {
  return BACKUP_TYPE_VALUES.map(v => ({
    value: v,
    label: t(`types.${v}_label`),
    description: t(`types.${v}_desc`),
  }))
}

// ── Add/Edit Source Modal ─────────────────────────────────────────────────────

interface SourceModalProps {
  source?: BackupSource | null
  onClose: () => void
  onSave: (data: { name: string; type: string; config: Record<string, unknown>; enabled: boolean }) => Promise<void>
}

function SourceModal({ source, onClose, onSave }: SourceModalProps) {
  const { t } = useTranslation('backup')
  const BACKUP_TYPES = useBackupTypes(t)
  const [name, setName] = useState(source?.name ?? '')
  const [type, setType] = useState(source?.type ?? 'ca_backup')
  const [enabled, setEnabled] = useState(source?.enabled ?? true)
  const [config, setConfig] = useState<Record<string, unknown>>(source?.config ?? {})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!name.trim() || !type) { setError(t('source.name_type_required')); return }
    setSaving(true)
    setError(null)
    try {
      await onSave({ name: name.trim(), type, config, enabled })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('source.save_error'))
    } finally {
      setSaving(false)
    }
  }

  const updateConfig = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="glass modal" style={{ width: '100%', maxWidth: 520, padding: 24, borderRadius: 'var(--radius-xl)' }}>
        <h3 style={{ margin: '0 0 20px', fontFamily: 'var(--font-display)' }}>{source ? t('source.modal_title_edit') : t('source.modal_title_add')}</h3>

        {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="field-label">{t('form.name_label')}</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={t('form.name_placeholder')} />
          </div>

          <div>
            <label className="field-label">{t('form.type_label')}</label>
            <select className="input" value={type} onChange={e => { setType(e.target.value); setConfig({}) }}>
              {BACKUP_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              {BACKUP_TYPES.find(t => t.value === type)?.description}
            </span>
          </div>

          {type === 'ca_backup' && (
            <div>
              <label className="field-label">{t('form.log_path_label')}</label>
              <input className="input" value={(config.logPath as string) ?? ''} onChange={e => updateConfig('logPath', e.target.value)} placeholder="/boot/logs/CA_backup.log" />
            </div>
          )}

          {type === 'duplicati' && (
            <>
              <div>
                <label className="field-label">URL</label>
                <input className="input" value={(config.url as string) ?? ''} onChange={e => updateConfig('url', e.target.value)} placeholder="http://192.168.1.x:8200" />
              </div>
              <div>
                <label className="field-label">API Key</label>
                <input className="input" value={(config.apiKey as string) ?? ''} onChange={e => updateConfig('apiKey', e.target.value)} placeholder="API Key" />
              </div>
            </>
          )}

          {type === 'kopia' && (
            <>
              <div>
                <label className="field-label">URL</label>
                <input className="input" value={(config.url as string) ?? ''} onChange={e => updateConfig('url', e.target.value)} placeholder="http://192.168.1.x:51515" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="field-label">{t('form.user_label')}</label>
                  <input className="input" value={(config.user as string) ?? 'kopia'} onChange={e => updateConfig('user', e.target.value)} placeholder="kopia" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="field-label">{t('form.password_label')}</label>
                  <input className="input" type="password" value={(config.pass as string) ?? ''} onChange={e => updateConfig('pass', e.target.value)} placeholder={t('form.password_placeholder')} />
                </div>
              </div>
            </>
          )}

          {type === 'vm' && (
            <div>
              <label className="field-label">{t('form.backup_path_label')}</label>
              <input className="input" value={(config.backupPath as string) ?? ''} onChange={e => updateConfig('backupPath', e.target.value)} placeholder="/mnt/user/backups/vms" />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="field-label" style={{ margin: 0 }}>{t('source.enabled')}</label>
            <button
              onClick={() => setEnabled(v => !v)}
              style={{ width: 40, height: 22, borderRadius: 11, background: enabled ? 'var(--accent)' : 'var(--glass-border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 200ms' }}
            >
              <span style={{ position: 'absolute', top: 2, left: enabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 200ms' }} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>{t('source.cancel')}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? t('source.saving') : t('source.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Status Card ───────────────────────────────────────────────────────────────

function StatusCard({ result }: { result: BackupStatusResult }) {
  const { t } = useTranslation('backup')
  const BACKUP_TYPES = useBackupTypes(t)
  const [expanded, setExpanded] = useState(false)
  const { language } = useLanguageStore()
  const dateLocale = language === 'de' ? 'de-DE' : 'en-US'

  const StatusIcon = result.error
    ? () => <XCircle size={16} style={{ color: 'var(--status-offline)' }} />
    : result.success === false
      ? () => <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
      : result.success === true
        ? () => <CheckCircle size={16} style={{ color: 'var(--status-online)' }} />
        : () => <Clock size={16} style={{ color: 'var(--text-muted)' }} />

  const statusText = result.error ? t('status.error') : result.success === false ? t('status.outdated') : result.success === true ? t('status.ok') : t('status.unknown')
  const statusColor = result.error ? 'var(--status-offline)' : result.success === false ? '#f59e0b' : result.success === true ? 'var(--status-online)' : 'var(--text-muted)'

  const typeLabel = BACKUP_TYPES.find(t => t.value === result.type)?.label ?? result.type

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return iso }
  }

  return (
    <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
      >
        <StatusIcon />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{result.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{typeLabel}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: statusColor }}>{statusText}</div>
          {result.lastRun && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('status.last_run')}: {fmtDate(result.lastRun)}</div>}
          {result.size && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('status.size')}: {result.size}</div>}
        </div>
        {expanded ? <ChevronDown size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />}
      </div>
      {expanded && result.error && (
        <div style={{ borderTop: '1px solid var(--glass-border)', padding: '10px 16px', fontSize: 12, color: 'var(--status-offline)', background: 'rgba(239,68,68,0.06)' }}>
          {result.error}
        </div>
      )}
    </div>
  )
}

// ── Guide Tab ─────────────────────────────────────────────────────────────────

interface GuideSectionProps {
  title: string
  children: React.ReactNode
}

function GuideSection({ title, children }: GuideSectionProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
        {open ? <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--glass-border)', padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function GuideTab() {
  const { t } = useTranslation('backup')
  const gc = (key: string) => t(`guide_content.${key}`)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 8px' }}>
        {gc('intro')}
      </p>

      <GuideSection title={gc('rule_321_title')}>
        <p style={{ margin: '0 0 8px' }}>{gc('rule_321_intro')}</p>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li><strong>3</strong> {gc('rule_321_copies')}</li>
          <li><strong>2</strong> {gc('rule_321_media')}</li>
          <li><strong>1</strong> {gc('rule_321_offsite')}</li>
        </ul>
      </GuideSection>

      <GuideSection title={gc('ca_backup_title')}>
        <p style={{ margin: '0 0 8px' }}>{gc('ca_backup_intro')}</p>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>{gc('ca_backup_1')}</li>
          <li>{gc('ca_backup_2')}</li>
          <li>{gc('ca_backup_3')}</li>
          <li>{gc('ca_backup_4')}</li>
        </ul>
      </GuideSection>

      <GuideSection title={gc('docker_title')}>
        <p style={{ margin: '0 0 8px' }}>{gc('docker_intro')}</p>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>{gc('docker_1')}</li>
          <li>{gc('docker_2')} <code style={{ background: 'var(--glass-bg)', padding: '1px 4px', borderRadius: 4 }}>/mnt/user/appdata</code></li>
          <li>{gc('docker_3')}</li>
          <li>{gc('docker_4')}</li>
        </ul>
      </GuideSection>

      <GuideSection title={gc('kopia_title')}>
        <p style={{ margin: '0 0 8px' }}>{gc('kopia_intro')}</p>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>{gc('kopia_1')}</li>
          <li>{gc('kopia_2')}</li>
          <li>{gc('kopia_3')}</li>
          <li>{gc('kopia_4')}</li>
        </ul>
      </GuideSection>

      <GuideSection title={gc('vm_title')}>
        <p style={{ margin: '0 0 8px' }}>{gc('vm_intro')}</p>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>{gc('vm_1')}</li>
          <li>{gc('vm_2')} <code style={{ background: 'var(--glass-bg)', padding: '1px 4px', borderRadius: 4 }}>/mnt/user/domains/</code></li>
          <li>{gc('vm_3')}</li>
          <li>{gc('vm_4')}</li>
        </ul>
      </GuideSection>

      <GuideSection title={gc('duplicati_title')}>
        <p style={{ margin: '0 0 8px' }}>{gc('duplicati_intro')}</p>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', margin: '0 0 10px', overflowX: 'auto', whiteSpace: 'pre' }}>{`docker run -d \\
  --name duplicati \\
  -p 8200:8200 \\
  -v /mnt/user/appdata/duplicati:/data \\
  -v /mnt/user/appdata:/source:ro \\
  -v /mnt/user/backup:/backup \\
  lscr.io/linuxserver/duplicati:latest`}</div>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>{gc('duplicati_1')}</li>
          <li><code style={{ background: 'var(--glass-bg)', padding: '1px 4px', borderRadius: 4 }}>http://server-ip:8200</code> {gc('duplicati_2')}</li>
          <li>{gc('duplicati_3')}</li>
          <li>{gc('duplicati_4')}</li>
          <li>{gc('duplicati_5')}</li>
          <li>{gc('duplicati_6')}</li>
          <li>{gc('duplicati_7')}</li>
          <li>{gc('duplicati_8')}</li>
          <li>{gc('duplicati_9')}</li>
        </ol>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
          {gc('duplicati_api_key_hint')}
        </p>
      </GuideSection>

      <GuideSection title={gc('test_title')}>
        <p style={{ margin: '0 0 8px' }}>{gc('test_intro')}</p>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>{gc('test_1')}</li>
          <li>{gc('test_2')}</li>
          <li>{gc('test_3')}</li>
          <li>{gc('test_4')}</li>
        </ul>
      </GuideSection>

      <GuideSection title={gc('dr_title')}>
        <p style={{ margin: '0 0 10px' }}>{gc('dr_intro')}</p>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>
            <strong>{gc('dr_1_title')}</strong><br />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{gc('dr_1_desc')}</span>
          </li>
          <li>
            <strong>{gc('dr_2_title')}</strong><br />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <code style={{ background: 'var(--glass-bg)', padding: '1px 4px', borderRadius: 4 }}>config/</code> {gc('dr_2_desc')}
            </span>
          </li>
          <li>
            <strong>{gc('dr_3_title')}</strong><br />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{gc('dr_3_desc')}</span>
          </li>
          <li>
            <strong>{gc('dr_4_title')}</strong><br />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{gc('dr_4_desc')}</span>
          </li>
          <li>
            <strong>{gc('dr_5_title')}</strong><br />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{gc('dr_5_desc')}</span>
          </li>
          <li>
            <strong>{gc('dr_6_title')}</strong><br />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{gc('dr_6_desc')}</span>
          </li>
          <li>
            <strong>{gc('dr_7_title')}</strong><br />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {gc('dr_7_desc')} <code style={{ background: 'var(--glass-bg)', padding: '1px 4px', borderRadius: 4 }}>docker exec mariadb mysql {'<'} db.sql</code>
            </span>
          </li>
          <li>
            <strong>{gc('dr_8_title')}</strong><br />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {gc('dr_8_desc')} <code style={{ background: 'var(--glass-bg)', padding: '1px 4px', borderRadius: 4 }}>/etc/libvirt/</code>
            </span>
          </li>
          <li>
            <strong>{gc('dr_9_title')} ✓</strong><br />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{gc('dr_9_desc')}</span>
          </li>
        </ol>
      </GuideSection>
    </div>
  )
}

// ── Main BackupPage ───────────────────────────────────────────────────────────

export function BackupPage() {
  const { t } = useTranslation('backup')
  const BACKUP_TYPES = useBackupTypes(t)
  const { isAdmin } = useStore()
  const [tab, setTab] = useState<'overview' | 'guide'>('overview')
  const [sources, setSources] = useState<BackupSource[]>([])
  const [statusResults, setStatusResults] = useState<BackupStatusResult[]>([])
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editSource, setEditSource] = useState<BackupSource | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const { toast } = useToast()

  const loadSources = async () => {
    try {
      const data = await api.backup.sources.list()
      setSources(data)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const loadStatus = async () => {
    setStatusLoading(true)
    try {
      const data = await api.backup.status()
      setStatusResults(data.sources)
    } catch { /* ignore */ } finally {
      setStatusLoading(false)
    }
  }

  useEffect(() => { loadSources() }, [])
  useEffect(() => { if (tab === 'overview' && sources.length > 0) { loadStatus() } }, [sources.length, tab])

  const handleSave = async (data: { name: string; type: string; config: Record<string, unknown>; enabled: boolean }) => {
    if (editSource) {
      await api.backup.sources.update(editSource.id, data)
    } else {
      await api.backup.sources.create(data)
    }
    await loadSources()
  }

  const handleDelete = async (source: BackupSource) => {
    try {
      await api.backup.sources.delete(source.id)
      await loadSources()
      toast({ message: t('toast.removed', { name: source.name }), type: 'info' })
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : t('toast.error'), type: 'error' })
    }
  }

  const handleDockerExport = async () => {
    setExportLoading(true)
    try {
      const blob = await api.backup.dockerExport()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `heldash-docker-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast({ message: t('toast.export_success'), type: 'success' })
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : t('toast.export_failed'), type: 'error' })
    } finally {
      setExportLoading(false)
    }
  }

  const okCount = statusResults.filter(r => r.success === true && !r.error).length
  const warnCount = statusResults.filter(r => r.success === false || (r.success === null && !r.error)).length
  const errCount = statusResults.filter(r => r.error).length

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>{t('title')}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={handleDockerExport} disabled={exportLoading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> {t('actions.docker_export')}
          </button>
          {isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => { setEditSource(null); setShowAddModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} /> {t('source.add')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--glass-border)', paddingBottom: 0 }}>
        {[{ key: 'overview', label: t('tabs.overview') }, { key: 'guide', label: t('tabs.guide') }].map(tabItem => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key as 'overview' | 'guide')}
            style={{
              padding: '8px 16px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === tabItem.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === tabItem.key ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: tab === tabItem.key ? 600 : 400,
              marginBottom: -1,
            }}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Stats */}
          {statusResults.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: `${okCount} ${t('status.ok')}`, color: 'var(--status-online)' },
                { label: `${warnCount} ${t('status.outdated')}`, color: '#f59e0b' },
                { label: `${errCount} ${t('status.error')}`, color: 'var(--status-offline)' },
              ].map(s => (
                <div key={s.label} className="glass" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 'var(--radius-md)', color: s.color, fontSize: 13, fontWeight: 500 }}>
                  {s.label}
                </div>
              ))}
              <button
                className="btn btn-ghost"
                onClick={loadStatus}
                disabled={statusLoading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
              >
                <RefreshCw size={13} style={{ animation: statusLoading ? 'spin 1s linear infinite' : 'none' }} />
                {t('actions.refresh')}
              </button>
            </div>
          )}

          {/* Source list with status */}
          {sources.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💾</div>
              <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>{t('empty.title')}</h3>
              <p style={{ marginBottom: 20 }}>{t('empty.subtitle')}</p>
              {isAdmin && (
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>{t('source.add_first')}</button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Status results (if loaded) */}
              {statusResults.length > 0 ? (
                statusResults.map(result => (
                  <div key={result.id} style={{ position: 'relative' }}>
                    <StatusCard result={result} />
                    {isAdmin && (
                      <div style={{ position: 'absolute', top: 12, right: 48, display: 'flex', gap: 4 }}>
                        <button
                          className="btn-icon"
                          onClick={() => {
                            const src = sources.find(s => s.id === result.id)
                            if (src) { setEditSource(src); setShowAddModal(true) }
                          }}
                          title={t('actions.edit')}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => {
                            const src = sources.find(s => s.id === result.id)
                            if (src) handleDelete(src)
                          }}
                          title={t('actions.delete')}
                          style={{ color: 'var(--status-offline)' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                /* Loading / sources list without status */
                sources.map(source => (
                  <div key={source.id} className="glass" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{source.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{BACKUP_TYPES.find(t => t.value === source.type)?.label ?? source.type}</div>
                    </div>
                    {!source.enabled && <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 8px', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}>{t('disabled_badge')}</span>}
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" onClick={() => { setEditSource(source); setShowAddModal(true) }} title={t('actions.edit')}><Edit2 size={13} /></button>
                        <button className="btn-icon" onClick={() => handleDelete(source)} title={t('actions.delete')} style={{ color: 'var(--status-offline)' }}><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {tab === 'guide' && <GuideTab />}

      {showAddModal && (
        <SourceModal
          source={editSource}
          onClose={() => { setShowAddModal(false); setEditSource(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
