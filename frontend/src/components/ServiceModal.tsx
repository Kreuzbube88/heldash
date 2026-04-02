import { useState, useEffect } from 'react'
import type { Service } from '../types'
import { useStore } from '../store/useStore'
import { useDashboardStore } from '../store/useDashboardStore'
import { api, getIconUrl } from '../api'
import { X } from 'lucide-react'
import { IconPicker } from './IconPicker'
import { useTranslation } from 'react-i18next'

interface Props {
  service?: Service | null
  onClose: () => void
}

const defaultForm = {
  name: '',
  url: '',
  icon: '',
  description: '',
  group_id: '',
  check_enabled: true,
  check_url: '',
  check_interval: 60,
}

export function ServiceModal({ service, onClose }: Props) {
  const { t } = useTranslation('services')
  const { createService, updateService, groups } = useStore()
  const { isOnDashboard, getDashboardItemId, addService, removeItem, removeByRef } = useDashboardStore()
  const [form, setForm] = useState(defaultForm)
  const [showOnDashboard, setShowOnDashboard] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Icon picker state
  const [iconId, setIconId] = useState<string | null>(null)
  const [iconChanged, setIconChanged] = useState(false)

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name,
        url: service.url,
        icon: service.icon ?? '',
        description: service.description ?? '',
        group_id: service.group_id ?? '',
        check_enabled: !!service.check_enabled,
        check_url: service.check_url ?? '',
        check_interval: service.check_interval ?? 60,
      })
      setShowOnDashboard(isOnDashboard('service', service.id))
    } else {
      setForm(defaultForm)
      setShowOnDashboard(false)
    }
    setIconId(null)
    setIconChanged(false)
  }, [service])

  const set = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      setError(t('modal.name_url_required'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const data: typeof defaultForm & { icon_id?: string | null } = {
        ...form,
        icon: form.icon || null,
        description: form.description || null,
        group_id: form.group_id || null,
        check_url: form.check_url || null,
      }
      if (iconChanged) {
        data.icon_id = iconId
      }

      let serviceId: string
      if (service) {
        serviceId = service.id
        await updateService(service.id, data)
      } else {
        serviceId = await createService(data)
      }

      // Sync dashboard membership
      const wasOnDashboard = service ? isOnDashboard('service', service.id) : false
      if (showOnDashboard && !wasOnDashboard) {
        await addService(serviceId)
      } else if (!showOnDashboard && wasOnDashboard && service) {
        const itemId = getDashboardItemId('service', service.id)
        if (itemId) await removeItem(itemId)
        else await removeByRef('service', service.id)
      }

      onClose()
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>
            {service ? t('modal.title_edit') : t('modal.title_add')}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">{t('modal.name')}</label>
          <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Radarr" />
        </div>

        <div className="form-group">
          <label className="form-label">{t('modal.url')}</label>
          <input className="form-input" value={form.url} onChange={e => set('url', e.target.value)} placeholder="http://192.168.1.10:7878" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">{t('modal.icon_emoji')}</label>
            <input className="form-input" value={form.icon} onChange={e => set('icon', e.target.value)} placeholder="🎬" maxLength={4} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('modal.group')}</label>
            <select className="form-input" value={form.group_id} onChange={e => set('group_id', e.target.value)}>
              <option value="">{t('modal.no_group')}</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>

        {/* Icon image */}
        <div className="form-group">
          <label className="form-label">{t('modal.icon_image')}</label>
          <IconPicker
            iconId={iconId}
            iconUrl={(!iconChanged && service) ? getIconUrl(service) : null}
            onChange={id => { setIconId(id); setIconChanged(true) }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
            {t('modal.icon_image_hint')}
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">{t('modal.description')}</label>
          <input className="form-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder={t('modal.description_placeholder')} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-toggle">
              <input
                type="checkbox"
                checked={form.check_enabled}
                onChange={async e => {
                  const wasDisabled = !form.check_enabled
                  const nowEnabled = e.target.checked
                  set('check_enabled', nowEnabled)
                  // Auto-run check when enabling (if editing existing service)
                  if (wasDisabled && nowEnabled && service?.id) {
                    try {
                      await api.services.check(service.id)
                    } catch {
                      // Silently fail, user can manually trigger check if needed
                    }
                  }
                }}
              />
              <span className="form-label" style={{ margin: 0 }}>{t('modal.enable_check')}</span>
            </label>
          </div>
          <div className="form-group">
            <label className="form-toggle">
              <input
                type="checkbox"
                checked={showOnDashboard}
                onChange={e => setShowOnDashboard(e.target.checked)}
              />
              <span className="form-label" style={{ margin: 0 }}>{t('modal.show_dashboard')}</span>
            </label>
          </div>
        </div>

        {form.check_enabled && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">{t('modal.check_url')}</label>
              <input className="form-input" value={form.check_url} onChange={e => set('check_url', e.target.value)} placeholder={t('modal.check_url_placeholder')} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('modal.interval')}</label>
              <input className="form-input" type="number" value={form.check_interval} onChange={e => set('check_interval', Number(e.target.value))} min={10} />
            </div>
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--status-offline)', fontSize: 13, marginBottom: 16, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>{t('modal.cancel')}</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : (service ? t('modal.save') : t('modal.add_btn'))}
          </button>
        </div>
      </div>
    </div>
  )
}
