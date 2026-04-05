import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Wifi, WifiOff, Loader2, X, CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useInstanceStore } from '../store/useInstanceStore'
import { useConfirm } from '../components/ConfirmDialog'
import { IconPicker } from '../components/IconPicker'
import { getIconUrl } from '../api'
import type { Instance, InstanceType } from '../types'

// ── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<InstanceType, string> = {
  ha: 'Home Assistant',
  radarr: 'Radarr',
  sonarr: 'Sonarr',
  prowlarr: 'Prowlarr',
  sabnzbd: 'SABnzbd',
  seerr: 'Seerr',
  unraid: 'Unraid',
  helbackup: 'HELBACKUP',
}

const TYPE_COLORS: Record<InstanceType, string> = {
  ha: '#38bdf8',
  radarr: '#f59e0b',
  sonarr: '#60a5fa',
  prowlarr: '#a78bfa',
  sabnzbd: '#22c55e',
  seerr: '#f97316',
  unraid: '#f43f5e',
  helbackup: '#10b981',
}

const TOKEN_TYPES: InstanceType[] = ['ha', 'helbackup']
const ALL_TYPES: InstanceType[] = ['ha', 'radarr', 'sonarr', 'prowlarr', 'sabnzbd', 'seerr', 'unraid', 'helbackup']

function needsToken(type: InstanceType) { return TOKEN_TYPES.includes(type) }

// ── Instance modal ─────────────────────────────────────────────────────────────

function InstanceModal({
  instance,
  onClose,
  onSave,
}: {
  instance?: Instance | null
  onClose: () => void
  onSave: (data: { type: InstanceType; name: string; url: string; token?: string; api_key?: string; enabled: boolean; icon_id?: string | null }) => Promise<void>
}) {
  const [type, setType] = useState<InstanceType>(instance?.type ?? 'ha')
  const [name, setName] = useState(instance?.name ?? '')
  const [url, setUrl] = useState(instance?.url ?? '')
  const [credential, setCredential] = useState('')
  const [enabled, setEnabled] = useState(instance?.enabled ?? true)
  const [iconId, setIconId] = useState<string | null>(instance?.icon_id ?? null)
  const { t } = useTranslation('instances')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { confirm } = useConfirm()

  const hasChanges = () => {
    if (instance) {
      return name !== instance.name ||
        url !== instance.url ||
        enabled !== instance.enabled ||
        iconId !== instance.icon_id ||
        credential.trim() !== ''
    }
    return name.trim() !== '' || url.trim() !== '' || credential.trim() !== '' || iconId !== null
  }

  const handleClose = async () => {
    if (hasChanges()) {
      const ok = await confirm({
        title: t('modal.discard_title'),
        message: t('modal.discard_msg'),
        confirmLabel: t('modal.discard_confirm'),
        danger: true,
      })
      if (!ok) return
    }
    onClose()
  }

  const handleSave = async () => {
    if (!name.trim()) return setError(t('modal.name_required'))
    if (!url.trim()) return setError(t('modal.url_required'))
    if (!instance && !credential.trim()) return setError(needsToken(type) ? t('modal.token_required') : t('modal.api_key_required'))
    setSaving(true)
    setError(null)
    try {
      const data: { type: InstanceType; name: string; url: string; token?: string; api_key?: string; enabled: boolean; icon_id?: string | null } = {
        type,
        name: name.trim(),
        url: url.trim(),
        enabled,
        icon_id: iconId,
      }
      if (credential.trim()) {
        if (needsToken(type)) data.token = credential.trim()
        else data.api_key = credential.trim()
      }
      await onSave(data)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('modal.save_failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) void handleClose() }}>
      <div className="glass modal" style={{ width: '100%', maxWidth: 460, padding: 24, borderRadius: 'var(--radius-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>{instance ? t('modal.title_edit') : t('modal.title_add')}</h3>
          <button onClick={() => void handleClose()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!instance && (
            <div>
              <label className="field-label">{t('modal.type')} *</label>
              <select className="input" value={type} onChange={e => setType(e.target.value as InstanceType)}>
                {ALL_TYPES.map(tp => <option key={tp} value={tp}>{TYPE_LABELS[tp]}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="field-label">{t('modal.name')} *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={t('modal.name')} />
          </div>
          <div>
            <label className="field-label">{t('modal.url')} *</label>
            <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="http://192.168.1.10:7878" />
          </div>
          <div>
            <label className="field-label">
              {type === 'helbackup' ? 'API Token' : needsToken(type) ? 'Token' : 'API Key'}
              {!instance && ' *'}
              {instance && ` (${t('modal.credential_empty_hint')})`}
            </label>
            <input
              className="input"
              type="password"
              value={credential}
              onChange={e => setCredential(e.target.value)}
              placeholder={instance ? '••••••••' : type === 'helbackup' ? 'helbackup_XXXXXXXXXXXXXXXXX' : needsToken(type) ? 'Long-Lived Access Token' : 'API Key'}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            <span style={{ fontSize: 13 }}>{t('modal.enabled')}</span>
          </label>
          <div>
            <label className="field-label">{t('modal.icon')} (optional)</label>
            <IconPicker value={iconId} onChange={setIconId} size="medium" />
            {iconId && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <img
                  src={getIconUrl({ icon_id: iconId })}
                  alt="Selected icon"
                  style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6, background: 'var(--glass-bg)', padding: 4 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('modal.selected_icon')}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={() => void handleClose()}>{t('modal.cancel')}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? t('modal.saving') : t('modal.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Instance card ─────────────────────────────────────────────────────────────

type TestState = 'idle' | 'testing' | 'ok' | 'fail'

function InstanceCard({
  instance,
  onEdit,
  onDelete,
  onTest,
}: {
  instance: Instance
  onEdit: () => void
  onDelete: () => void
  onTest: () => Promise<{ ok: boolean; error?: string }>
}) {
  const { t } = useTranslation('instances')
  const [testState, setTestState] = useState<TestState>('idle')
  const [testError, setTestError] = useState<string | null>(null)

  const handleTest = async () => {
    setTestState('testing')
    setTestError(null)
    try {
      const res = await onTest()
      setTestState(res.ok ? 'ok' : 'fail')
      if (!res.ok) setTestError(res.error ?? t('test.failed'))
    } catch {
      setTestState('fail')
    }
    setTimeout(() => setTestState('idle'), 4000)
  }

  return (
    <div className="glass" style={{ borderRadius: 'var(--radius-md)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 36, height: 36, flexShrink: 0, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${TYPE_COLORS[instance.type]}22`, border: `1px solid ${TYPE_COLORS[instance.type]}44`, overflow: 'hidden',
      }}>
        {(() => {
          const iconUrl = getIconUrl(instance)
          return iconUrl ? (
            <img src={iconUrl} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 11, fontWeight: 700, color: TYPE_COLORS[instance.type], fontFamily: 'var(--font-mono)' }}>
              {instance.type.slice(0, 3).toUpperCase()}
            </span>
          )
        })()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{instance.name}</span>
          {!instance.enabled && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 4, padding: '1px 5px' }}>{t('card.disabled')}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>{instance.url}</div>
        {testState === 'fail' && testError && (
          <div style={{ fontSize: 11, color: 'var(--status-offline)', marginTop: 2 }}>{testError}</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
        <button
          className="btn-icon"
          onClick={handleTest}
          disabled={testState === 'testing'}
          title={t('card.test')}
          style={{ color: testState === 'ok' ? 'var(--status-online)' : testState === 'fail' ? 'var(--status-offline)' : undefined }}
        >
          {testState === 'testing' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> :
           testState === 'ok' ? <CheckCircle2 size={13} /> :
           testState === 'fail' ? <XCircle size={13} /> :
           <Wifi size={13} />}
        </button>
        <button className="btn-icon" onClick={onEdit} title={t('card.edit')}><Pencil size={13} /></button>
        <button className="btn-icon" onClick={onDelete} title={t('card.delete')} style={{ color: 'var(--status-offline)' }}><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

// ── InstancesPage ─────────────────────────────────────────────────────────────

export function InstancesPage() {
  const { t } = useTranslation('instances')
  const { instances, loading, loadInstances, createInstance, updateInstance, deleteInstance, testInstance } = useInstanceStore()
  const { confirm } = useConfirm()
  const [showModal, setShowModal] = useState(false)
  const [editInstance, setEditInstance] = useState<Instance | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadInstances().catch(e => setError(e instanceof Error ? e.message : t('load_error'))) }, [])

  const handleSave = async (data: { type: InstanceType; name: string; url: string; token?: string; api_key?: string; enabled: boolean; icon_id?: string | null }) => {
    if (editInstance) {
      await updateInstance(editInstance.id, data)
    } else {
      await createInstance(data)
    }
  }

  const handleDelete = async (instance: Instance) => {
    const ok = await confirm({
      title: t('delete_title'),
      message: t('delete_msg', { name: instance.name, type: TYPE_LABELS[instance.type] }),
      confirmLabel: t('delete_confirm'),
      danger: true,
    })
    if (!ok) return
    try {
      await deleteInstance(instance.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('delete_error'))
    }
  }

  // Group by type
  const byType = ALL_TYPES.reduce<Record<string, Instance[]>>((acc, tp) => {
    acc[tp] = instances.filter(i => i.type === tp).sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
    return acc
  }, {} as Record<string, Instance[]>)

  const totalCount = instances.length

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>{t('title')}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>{t('count', { count: totalCount })}</p>
          {error && <div className="error-banner" style={{ marginTop: 8 }}>{error}</div>}
        </div>
        <button className="btn btn-primary" onClick={() => { setEditInstance(null); setShowModal(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> {t('add')}
        </button>
      </div>

      {totalCount === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <WifiOff size={40} style={{ marginBottom: 16, opacity: 0.4 }} />
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>{t('empty_title')}</h3>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>{t('empty_add')}</button>
        </div>
      ) : (
        ALL_TYPES.filter(tp => byType[tp].length > 0).map(type => (
          <div key={type}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[type as InstanceType], flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
                {TYPE_LABELS[type as InstanceType]}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {byType[type].map(inst => (
                <InstanceCard
                  key={inst.id}
                  instance={inst}
                  onEdit={() => { setEditInstance(inst); setShowModal(true) }}
                  onDelete={() => handleDelete(inst)}
                  onTest={() => testInstance(inst.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {showModal && (
        <InstanceModal
          instance={editInstance}
          onClose={() => { setShowModal(false); setEditInstance(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
