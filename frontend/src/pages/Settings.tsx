import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguageStore } from '../store/useLanguageStore'
import { useStore } from '../store/useStore'
import { useArrStore } from '../store/useArrStore'
import { useWidgetStore } from '../store/useWidgetStore'
import { Plus, Trash2, Users, Shield, Pencil, X, Check, Eye, EyeOff, Settings, KeyRound, Upload, ImageIcon, Palette, AlertTriangle } from 'lucide-react'
import type { UserRecord, UserGroup, Service, Background, Settings as SettingsType } from '../types'
import type { ArrInstance } from '../types/arr'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'
import { getIconUrl } from '../api'

type SettingsTab = 'general' | 'design' | 'users' | 'groups' | 'oidc'

// ── Tab bar ───────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }: { active: SettingsTab; onChange: (t: SettingsTab) => void }) {
  const { t } = useTranslation('settings')
  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: t('tabs.general'), icon: <Settings size={13} /> },
    { id: 'design',  label: t('tabs.design'),  icon: <Palette size={13} /> },
    { id: 'users',   label: t('tabs.users'),   icon: <Users size={13} /> },
    { id: 'groups',  label: t('tabs.groups'),  icon: <Shield size={13} /> },
    { id: 'oidc',    label: t('tabs.oidc'), icon: <KeyRound size={13} /> },
  ]
  return (
    <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '6px 8px', display: 'flex', gap: 2, alignSelf: 'center' }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13, fontWeight: active === t.id ? 600 : 400,
            background: active === t.id ? 'rgba(var(--accent-rgb), 0.12)' : 'transparent',
            color: active === t.id ? 'var(--accent)' : 'var(--text-secondary)',
            border: active === t.id ? '1px solid rgba(var(--accent-rgb), 0.25)' : '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Inline user edit form ─────────────────────────────────────────────────────
function UserEditRow({
  user,
  userGroups,
  isSelf,
  onSave,
  onCancel,
}: {
  user: UserRecord
  userGroups: UserGroup[]
  isSelf: boolean
  onSave: (data: { user_group_id: string | null; is_active: boolean; password?: string }) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation('settings')
  const [groupId, setGroupId] = useState(user.user_group_id ?? '')
  const [isActive, setIsActive] = useState(user.is_active)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setError('')
    if (password && password.length < 8) return setError(t('user_edit.password_min'))
    setSaving(true)
    try {
      await onSave({
        user_group_id: groupId || null,
        is_active: isActive,
        ...(password ? { password } : {}),
      })
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass" style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 }}>
          <label className="form-label" style={{ fontSize: 11 }}>{t('user_edit.group')}</label>
          <select className="form-input" value={groupId} onChange={e => setGroupId(e.target.value)} style={{ fontSize: 13, padding: '5px 8px' }} disabled={isSelf}>
            <option value="">{t('user_edit.no_group')}</option>
            {[...userGroups].sort((a, b) => a.name.localeCompare(b.name)).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label className="form-label" style={{ fontSize: 11 }}>{t('user_edit.active')}</label>
          <button
            type="button"
            onClick={() => setIsActive(a => !a)}
            disabled={isSelf}
            style={{
              padding: '5px 12px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600,
              cursor: isSelf ? 'default' : 'pointer',
              background: isActive ? 'rgba(34,197,94,0.12)' : 'var(--glass-bg)',
              color: isActive ? 'var(--status-online)' : 'var(--text-muted)',
              border: `1px solid ${isActive ? 'rgba(34,197,94,0.25)' : 'var(--glass-border)'}`,
            }}
          >
            {isActive ? t('user_edit.status_active') : t('user_edit.status_disabled')}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160 }}>
          <label className="form-label" style={{ fontSize: 11 }}>{t('user_edit.new_password')}</label>
          <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('user_edit.leave_empty')} style={{ fontSize: 13, padding: '5px 8px' }} />
        </div>
      </div>
      {error && <div style={{ fontSize: 12, color: 'var(--status-offline)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ gap: 4, fontSize: 12 }}>
          <Check size={12} /> {saving ? t('user_edit.saving') : t('user_edit.save')}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel} style={{ gap: 4, fontSize: 12 }}>
          <X size={12} /> {t('user_edit.cancel')}
        </button>
      </div>
    </div>
  )
}

// ── Reusable visibility checklist ─────────────────────────────────────────────
function VisibilityChecklist({
  label,
  items,
  hiddenIds,
  onSave,
}: {
  label: string
  items: { id: string; name: string; icon?: string | null; icon_url?: string | null; icon_id?: string | null }[]
  hiddenIds: string[]
  onSave: (hiddenIds: string[]) => Promise<void>
}) {
  const { t } = useTranslation('settings')
  const [hidden, setHidden] = useState<Set<string>>(new Set(hiddenIds))
  const [saving, setSaving] = useState(false)

  useEffect(() => { setHidden(new Set(hiddenIds)) }, [hiddenIds.join(',')])

  const toggle = (id: string) => {
    const next = new Set(hidden)
    next.has(id) ? next.delete(id) : next.add(id)
    setHidden(next)
    setSaving(true)
    onSave([...next]).finally(() => setSaving(false))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{label}</div>
        {saving && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('visibility.saving')}</span>}
      </div>
      {items.length === 0
        ? <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('visibility.none_configured')}</span>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {items.map(item => {
              const visible = !hidden.has(item.id)
              return (
                <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={visible} onChange={() => toggle(item.id)} disabled={saving} style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                  {getIconUrl(item)
                    ? <img src={getIconUrl(item)!} alt="" style={{ width: 16, height: 16, objectFit: 'contain', borderRadius: 3, flexShrink: 0 }} />
                    : item.icon ? <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span> : null
                  }
                  <span style={{ color: visible ? 'var(--text-primary)' : 'var(--text-muted)' }}>{item.name}</span>
                  {visible
                    ? <Eye size={11} style={{ color: 'var(--status-online)', marginLeft: 'auto' }} />
                    : <EyeOff size={11} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
                  }
                </label>
              )
            })}
          </div>
        )
      }
    </div>
  )
}

// ── Per-group visibility editor ───────────────────────────────────────────────
function GroupVisibilityEditor({
  group, services, arrInstances, widgets, backgrounds,
  onSaveApps, onSaveArr, onSaveWidgets,
  onToggleDockerAccess, onToggleDockerWidgetAccess,
  onSetBackground,
}: {
  group: UserGroup
  services: Service[]
  arrInstances: ArrInstance[]
  widgets: { id: string; name: string; type: string }[]
  backgrounds: Background[]
  onSaveApps: (hiddenIds: string[]) => Promise<void>
  onSaveArr: (hiddenIds: string[]) => Promise<void>
  onSaveWidgets: (hiddenIds: string[]) => Promise<void>
  onToggleDockerAccess: (enabled: boolean) => void
  onToggleDockerWidgetAccess: (enabled: boolean) => void
  onSetBackground: (backgroundId: string | null) => void
}) {
  const { t } = useTranslation('settings')
  const [tab, setTab] = useState<'apps' | 'media' | 'widgets' | 'docker' | 'background'>('apps')
  // Non-docker widgets only in the widgets tab (docker_overview is managed via the Docker tab)
  const nonDockerWidgets = widgets.filter(w => w.type !== 'docker_overview')
  const visTabLabel: Record<string, string> = {
    apps: t('visibility.apps'),
    media: t('visibility.media'),
    widgets: t('visibility.widgets'),
    docker: t('visibility.docker'),
    background: t('visibility.background'),
  }
  return (
    <div style={{ padding: '10px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {(['apps', 'media', 'widgets', 'docker', 'background'] as const).map(tabId => (
          <button
            key={tabId}
            className="btn btn-ghost btn-sm"
            onClick={() => setTab(tabId)}
            style={{ fontSize: 11, padding: '3px 10px', textTransform: 'capitalize', color: tab === tabId ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === tabId ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0 }}
          >
            {visTabLabel[tabId]}
          </button>
        ))}
      </div>
      {tab === 'apps' && <VisibilityChecklist label={t('visibility.label')} items={services} hiddenIds={group.hidden_service_ids} onSave={onSaveApps} />}
      {tab === 'media' && <VisibilityChecklist label={t('visibility.label')} items={arrInstances.map(i => ({ id: i.id, name: i.name }))} hiddenIds={group.hidden_arr_ids} onSave={onSaveArr} />}
      {tab === 'widgets' && <VisibilityChecklist label={t('visibility.label')} items={nonDockerWidgets} hiddenIds={group.hidden_widget_ids ?? []} onSave={onSaveWidgets} />}
      {tab === 'docker' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{t('docker_permissions.title')}</div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={group.docker_access}
              onChange={e => onToggleDockerAccess(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 14, height: 14, marginTop: 2, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{t('docker_permissions.page_label')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t('docker_permissions.page_desc')}</div>
            </div>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={group.docker_widget_access}
              onChange={e => onToggleDockerWidgetAccess(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 14, height: 14, marginTop: 2, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{t('docker_permissions.widget_label')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t('docker_permissions.widget_desc')}</div>
            </div>
          </label>
        </div>
      )}
      {tab === 'background' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{t('background.title')}</div>
          <select
            className="form-input"
            value={group.background_id ?? ''}
            onChange={e => onSetBackground(e.target.value || null)}
            style={{ fontSize: 13 }}
          >
            <option value="">{t('background.no_background')}</option>
            {[...backgrounds].sort((a, b) => a.name.localeCompare(b.name)).map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {backgrounds.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('background.none_uploaded')}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Toggle button group ────────────────────────────────────────────────────────
function ToggleGroup<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; sub?: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            fontWeight: value === o.value ? 600 : 400,
            background: value === o.value ? 'rgba(var(--accent-rgb), 0.12)' : 'var(--glass-bg)',
            color: value === o.value ? 'var(--accent)' : 'var(--text-secondary)',
            border: value === o.value ? '1px solid rgba(var(--accent-rgb), 0.25)' : '1px solid var(--glass-border)',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {o.label}
          {o.sub && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{o.sub}</span>}
        </button>
      ))}
    </div>
  )
}

// ── Main Settings page ────────────────────────────────────────────────────────
export function SettingsPage({ onStartOnboarding }: { onStartOnboarding?: () => void }) {
  const { t } = useTranslation('settings')
  const { language, setLanguage } = useLanguageStore()
  const {
    settings, updateSettings, groups, createGroup, deleteGroup,
    services,
    isAdmin, authUser,
    users, loadUsers, createUser, updateUser, deleteUser,
    userGroups, loadUserGroups, createUserGroup, deleteUserGroup,
    updateGroupVisibility, updateArrVisibility, updateWidgetVisibility,
    updateDockerAccess, updateDockerWidgetAccess,
    backgrounds, loadBackgrounds, uploadBackground, deleteBackground, setGroupBackground,
  } = useStore()
  const { instances: arrInstances, loadInstances } = useArrStore()
  const { widgets, loadWidgets } = useWidgetStore()
  const { toast } = useToast()
  const { confirm: confirmDlg } = useConfirm()

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  const [title, setTitle] = useState(settings?.dashboard_title ?? 'HELDASH')
  const [newGroup, setNewGroup] = useState('')
  const [groupError, setGroupError] = useState('')
  const [saving, setSaving] = useState(false)

  const [tmdbKey, setTmdbKey] = useState(settings?.tmdb_api_key ?? '')
  const [tmdbKeySaving, setTmdbKeySaving] = useState(false)
  useEffect(() => { setTmdbKey(settings?.tmdb_api_key ?? '') }, [settings?.tmdb_api_key])

  const [autoTheme, setAutoTheme] = useState(settings?.auto_theme_enabled ?? false)
  const [lightStart, setLightStart] = useState(settings?.auto_theme_light_start ?? '08:00')
  const [darkStart, setDarkStart] = useState(settings?.auto_theme_dark_start ?? '20:00')
  const [autoThemeSaving, setAutoThemeSaving] = useState(false)

  const saveAutoTheme = async (enabled: boolean, ls: string, ds: string) => {
    setAutoThemeSaving(true)
    try { await updateSettings({ auto_theme_enabled: enabled, auto_theme_light_start: ls, auto_theme_dark_start: ds }) }
    finally { setAutoThemeSaving(false) }
  }

  const saveTmdbKey = async () => {
    setTmdbKeySaving(true)
    try {
      await updateSettings({ tmdb_api_key: tmdbKey.trim() })
      toast({ message: t('general.tmdb_saved'), type: 'success', duration: 1500 })
    } catch { /* ignore */ }
    finally { setTmdbKeySaving(false) }
  }

  const [newUser, setNewUser] = useState({ username: '', first_name: '', last_name: '', email: '', password: '', user_group_id: 'grp_guest' })
  const [userError, setUserError] = useState('')
  const [addingUser, setAddingUser] = useState(false)

  const [newUG, setNewUG] = useState({ name: '', description: '' })
  const [ugError, setUgError] = useState('')

  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  // Background upload state
  const [bgName, setBgName] = useState('')
  const [bgFile, setBgFile] = useState<File | null>(null)
  const [bgUploading, setBgUploading] = useState(false)
  const [bgError, setBgError] = useState('')
  const bgFileRef = useRef<HTMLInputElement>(null)

  // Design settings — sync when settings load
  const [customCss, setCustomCss] = useState(settings?.design_custom_css ?? '')
  useEffect(() => { setCustomCss(settings?.design_custom_css ?? '') }, [settings?.design_custom_css])
  const customCssTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveDesign = useCallback(async (patch: Partial<SettingsType>) => {
    try {
      await updateSettings(patch)
      toast({ message: t('design.settings_saved'), type: 'success', duration: 1500 })
    } catch { /* ignore */ }
  }, [updateSettings, toast])

  const handleDesignChange = useCallback(<K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
    saveDesign({ [key]: value })
  }, [saveDesign])

  const handleCustomCssChange = useCallback((value: string) => {
    setCustomCss(value)
    if (customCssTimer.current) clearTimeout(customCssTimer.current)
    customCssTimer.current = setTimeout(() => {
      saveDesign({ design_custom_css: value })
    }, 500)
  }, [saveDesign])

  useEffect(() => {
    if (isAdmin) {
      Promise.all([loadUsers(), loadUserGroups(), loadInstances(), loadWidgets(), loadBackgrounds()]).catch(() => {})
    }
  }, [isAdmin])

  if (!settings) return null

  const saveTitle = async () => {
    setSaving(true)
    try { await updateSettings({ dashboard_title: title }) }
    finally { setSaving(false) }
  }

  const handleAddGroup = async () => {
    if (!newGroup.trim()) return
    setGroupError('')
    try { await createGroup({ name: newGroup.trim() }); setNewGroup('') }
    catch (e: unknown) { setGroupError((e as Error).message ?? t('general.error_create_group')) }
  }

  const handleAddUser = async () => {
    setUserError('')
    if (!newUser.username.trim()) return setUserError(t('users.validation_username'))
    if (!newUser.first_name.trim()) return setUserError(t('users.validation_first_name'))
    if (!newUser.last_name.trim()) return setUserError(t('users.validation_last_name'))
    if (newUser.password.length < 8) return setUserError(t('users.validation_password'))
    setAddingUser(true)
    try {
      await createUser({
        username: newUser.username.trim(),
        first_name: newUser.first_name.trim(),
        last_name: newUser.last_name.trim(),
        email: newUser.email.trim() || undefined,
        password: newUser.password,
        user_group_id: newUser.user_group_id || undefined,
      })
      setNewUser({ username: '', first_name: '', last_name: '', email: '', password: '', user_group_id: 'grp_guest' })
    } catch (e: unknown) {
      setUserError((e as Error).message)
    } finally {
      setAddingUser(false)
    }
  }

  const handleAddUserGroup = async () => {
    setUgError('')
    if (!newUG.name.trim()) return
    try { await createUserGroup({ name: newUG.name.trim(), description: newUG.description.trim() || undefined }); setNewUG({ name: '', description: '' }) }
    catch (e: unknown) { setUgError((e as Error).message ?? t('general.error_create_group')) }
  }

  const handleSaveUser = async (userId: string, data: Parameters<typeof updateUser>[1]) => {
    await updateUser(userId, data)
    setEditingUserId(null)
  }

  const groupName = (id: string | null) => {
    if (!id) return '—'
    const g = userGroups.find(g => g.id === id)
    return g ? g.name : '—'
  }

  const isAdminGroup = (id: string | null) => id === 'grp_admin'

  const handleBgUpload = async () => {
    if (!bgName.trim()) return setBgError(t('design.bg_error_name'))
    if (!bgFile) return setBgError(t('design.bg_error_file'))
    setBgError('')
    setBgUploading(true)
    try {
      await uploadBackground(bgName.trim(), bgFile)
      setBgName('')
      setBgFile(null)
      if (bgFileRef.current) bgFileRef.current.value = ''
    } catch (e: unknown) {
      setBgError((e as Error).message ?? t('design.bg_error_upload'))
    } finally {
      setBgUploading(false)
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── General ──────────────────────────────────────────────────────────── */}
      {activeTab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Dashboard title */}
          <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
            <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 600 }}>{t('general.title')}</h3>
            <div className="form-group">
              <label className="form-label">{t('general.dashboard_title')}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} />
                <button className="btn btn-primary" onClick={saveTitle} disabled={saving} style={{ flexShrink: 0 }}>
                  {saving ? t('general.saving') : t('general.save')}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">{t('language.label')}</label>
              <select
                className="form-input"
                value={language}
                onChange={e => setLanguage(e.target.value as 'de' | 'en')}
                style={{ maxWidth: 200 }}
              >
                <option value="de">{t('language.de')}</option>
                <option value="en">{t('language.en')}</option>
              </select>
            </div>
          </section>

          {/* Appearance */}
          <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
            <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>{t('general.appearance_title')}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('general.appearance_hint')}
            </p>
            <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('general.appearance_current')}</span>
              <span className="glass" style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                {settings.theme_mode} / {settings.theme_accent}
              </span>
            </div>

            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--glass-border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{t('general.auto_theme_title')}</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', marginBottom: 14 }}>
                <input
                  type="checkbox"
                  checked={autoTheme}
                  onChange={e => {
                    setAutoTheme(e.target.checked)
                    saveAutoTheme(e.target.checked, lightStart, darkStart)
                  }}
                  style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                />
                <span style={{ fontSize: 13 }}>{t('general.auto_theme_label')}</span>
              </label>
              {autoTheme && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 80 }}>{t('general.auto_theme_light_from')}</span>
                      <input
                        type="time"
                        className="form-input"
                        value={lightStart}
                        onChange={e => setLightStart(e.target.value)}
                        style={{ width: 110, fontSize: 13, padding: '4px 8px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 80 }}>{t('general.auto_theme_dark_from')}</span>
                      <input
                        type="time"
                        className="form-input"
                        value={darkStart}
                        onChange={e => setDarkStart(e.target.value)}
                        style={{ width: 110, fontSize: 13, padding: '4px 8px' }}
                      />
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => saveAutoTheme(autoTheme, lightStart, darkStart)}
                      disabled={autoThemeSaving}
                      style={{ fontSize: 12 }}
                    >
                      {autoThemeSaving ? t('general.auto_theme_saving') : t('general.auto_theme_save')}
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    {t('general.auto_theme_hint')}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* TMDB API Key */}
          {isAdmin && (
            <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
              <h3 style={{ marginBottom: 4, fontSize: 15, fontWeight: 600 }}>{t('general.integrations_title')}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                {t('general.integrations_desc')}
              </p>
              <div className="form-group">
                <label className="form-label">
                  {t('general.tmdb_label')}
                  <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                    {t('general.tmdb_hint')} <a
                      href="https://www.themoviedb.org/settings/api"
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: 'var(--accent)', textDecoration: 'none' }}
                    >{t('general.tmdb_link_text')}</a>
                  </span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="password"
                    className="form-input"
                    value={tmdbKey}
                    onChange={e => setTmdbKey(e.target.value)}
                    placeholder={t('general.tmdb_placeholder')}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                  />
                  <button className="btn btn-primary" onClick={saveTmdbKey} disabled={tmdbKeySaving} style={{ flexShrink: 0 }}>
                    {tmdbKeySaving ? t('general.saving') : t('general.save')}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* App Groups */}
          <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
            <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 600 }}>{t('general.app_groups_title')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {groups.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('general.no_groups')}</p>}
              {groups.map(g => (
                <div key={g.id} className="glass" style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--radius-md)', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14 }}>{g.icon ? `${g.icon} ` : ''}{g.name}</span>
                  {isAdmin && (
                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteGroup(g.id)} style={{ padding: '4px', width: 28, height: 28 }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isAdmin && (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" value={newGroup} onChange={e => setNewGroup(e.target.value)} placeholder={t('general.new_group_placeholder')} onKeyDown={e => e.key === 'Enter' && handleAddGroup()} />
                  <button className="btn btn-primary" onClick={handleAddGroup} style={{ flexShrink: 0 }}>
                    <Plus size={14} /> {t('general.add')}
                  </button>
                </div>
                {groupError && <div style={{ fontSize: 12, color: 'var(--status-offline)', marginTop: 6 }}>{groupError}</div>}
              </>
            )}
          </section>

          {/* Onboarding */}
          {isAdmin && onStartOnboarding && (
            <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
              <h3 style={{ marginBottom: 8, fontSize: 15, fontWeight: 600 }}>{t('general.wizard_title')}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                {t('general.wizard_desc')}
              </p>
              <button className="btn btn-ghost" onClick={onStartOnboarding} style={{ gap: 6, fontSize: 13 }}>
                {t('general.onboarding_restart')}
              </button>
            </section>
          )}
        </div>
      )}

      {/* ── Design ───────────────────────────────────────────────────────────── */}
      {activeTab === 'design' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Appearance */}
          <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
            <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 600 }}>{t('design.appearance_title')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{t('design.corner_style')}</div>
                <ToggleGroup
                  options={[
                    { value: 'sharp' as const, label: t('design.corner_sharp') },
                    { value: 'default' as const, label: t('design.corner_default') },
                    { value: 'rounded' as const, label: t('design.corner_rounded') },
                  ]}
                  value={settings?.design_border_radius ?? 'default'}
                  onChange={v => handleDesignChange('design_border_radius', v)}
                />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{t('design.bg_blur')}</div>
                <ToggleGroup
                  options={[
                    { value: 'subtle' as const, label: t('design.blur_subtle'), sub: t('design.blur_subtle_sub') },
                    { value: 'medium' as const, label: t('design.blur_medium'), sub: t('design.blur_medium_sub') },
                    { value: 'strong' as const, label: t('design.blur_strong'), sub: t('design.blur_strong_sub') },
                  ]}
                  value={settings?.design_glass_blur ?? 'medium'}
                  onChange={v => handleDesignChange('design_glass_blur', v)}
                />
              </div>
            </div>
          </section>

          {/* Layout & Density */}
          <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
            <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 600 }}>{t('design.layout_title')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{t('design.spacing')}</div>
                <ToggleGroup
                  options={[
                    { value: 'compact' as const, label: t('design.spacing_compact') },
                    { value: 'comfortable' as const, label: t('design.spacing_comfortable') },
                    { value: 'spacious' as const, label: t('design.spacing_spacious') },
                  ]}
                  value={settings?.design_density ?? 'comfortable'}
                  onChange={v => handleDesignChange('design_density', v)}
                />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{t('design.sidebar_style')}</div>
                <ToggleGroup
                  options={[
                    { value: 'default' as const, label: t('design.sidebar_default') },
                    { value: 'minimal' as const, label: t('design.sidebar_minimal') },
                    { value: 'floating' as const, label: t('design.sidebar_floating') },
                  ]}
                  value={settings?.design_sidebar_style ?? 'default'}
                  onChange={v => handleDesignChange('design_sidebar_style', v)}
                />
              </div>
            </div>
          </section>

          {/* Motion */}
          <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
            <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 600 }}>{t('design.motion_title')}</h3>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{t('design.animation_level')}</div>
              <ToggleGroup
                options={[
                  { value: 'full' as const, label: t('design.animation_full') },
                  { value: 'reduced' as const, label: t('design.animation_reduced') },
                  { value: 'none' as const, label: t('design.animation_none') },
                ]}
                value={settings?.design_animations ?? 'full'}
                onChange={v => handleDesignChange('design_animations', v)}
              />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
                {t('design.animation_hint')} <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>prefers-reduced-motion</code>.
              </p>
            </div>
          </section>

          {/* Backgrounds */}
          <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
            <h3 style={{ marginBottom: 4, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ImageIcon size={15} /> {t('design.bg_images_title')}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              {t('design.bg_images_desc')}
            </p>
            {backgrounds.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {backgrounds.map(bg => (
                  <div key={bg.id} className="glass" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                    <img src={bg.file_path} alt={bg.name} style={{ width: 48, height: 32, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0, border: '1px solid var(--glass-border)' }} />
                    <span style={{ flex: 1, fontSize: 13 }}>{bg.name}</span>
                    <button className="btn btn-danger btn-icon btn-sm" onClick={async () => { if (await confirmDlg({ title: t('confirm_delete_bg', { name: bg.name }), danger: true, confirmLabel: t('common:buttons.delete') })) deleteBackground(bg.id) }} style={{ padding: '4px', width: 28, height: 28, flexShrink: 0 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" placeholder={t('design.bg_name_placeholder')} value={bgName} onChange={e => setBgName(e.target.value)} style={{ flex: 1 }} />
                <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <Upload size={13} />
                  {bgFile ? bgFile.name : t('design.bg_choose')}
                  <input
                    ref={bgFileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/bmp"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f && f.size > 10 * 1024 * 1024) { setBgError(t('design.bg_max_size')); return }
                      setBgError('')
                      setBgFile(f ?? null)
                    }}
                  />
                </label>
                <button className="btn btn-primary" onClick={handleBgUpload} disabled={bgUploading} style={{ flexShrink: 0 }}>
                  <Plus size={14} /> {bgUploading ? t('design.bg_uploading') : t('design.bg_upload')}
                </button>
              </div>
              {bgError && <div style={{ fontSize: 12, color: 'var(--status-offline)' }}>{bgError}</div>}
            </div>
          </section>

          {/* Custom CSS */}
          <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
            <h3 style={{ marginBottom: 12, fontSize: 15, fontWeight: 600 }}>{t('design.css_title')}</h3>
            <div style={{ marginBottom: 12 }}>
              <span className="badge-warning">
                <AlertTriangle size={12} /> {t('design.css_warning')}
              </span>
            </div>
            <textarea
              className="form-input"
              rows={12}
              value={customCss}
              onChange={e => handleCustomCssChange(e.target.value)}
              placeholder={t('design.css_placeholder')}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12, width: '100%', resize: 'vertical' }}
            />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{t('design.css_hint')}</p>
          </section>

        </div>
      )}

      {/* ── Users ────────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && isAdmin && (
        <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={15} /> {t('users.title')}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {users.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('users.none_loaded')}</p>}
            {users.map(u => (
              <div key={u.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="glass" style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--radius-md)', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {u.username}
                      {u.id === authUser?.sub && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 'var(--radius-sm)', background: 'var(--glass-bg)', color: 'var(--accent)', border: '1px solid var(--glass-border)' }}>{t('users.badge_you')}</span>
                      )}
                      {!u.is_active && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 'var(--radius-sm)', background: 'var(--glass-bg)', color: 'var(--text-muted)', border: '1px solid var(--glass-border)' }}>{t('users.badge_disabled')}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>{u.first_name} {u.last_name}</span>
                      {u.email && <span>{u.email}</span>}
                      <span style={{ color: isAdminGroup(u.user_group_id) ? 'var(--accent)' : 'inherit' }}>
                        {groupName(u.user_group_id)}
                      </span>
                      {u.last_login && <span>{t('users.last_login')} {new Date(u.last_login).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US')}</span>}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditingUserId(editingUserId === u.id ? null : u.id)} data-tooltip={t('common:buttons.edit')} style={{ padding: '4px', width: 28, height: 28, flexShrink: 0 }}>
                    <Pencil size={12} />
                  </button>
                  {u.id !== authUser?.sub && (
                    <button className="btn btn-danger btn-icon btn-sm" onClick={async () => { if (await confirmDlg({ title: t('confirm_delete_user', { name: u.username }), danger: true, confirmLabel: t('common:buttons.delete') })) deleteUser(u.id) }} data-tooltip={t('common:buttons.delete')} style={{ padding: '4px', width: 28, height: 28, flexShrink: 0 }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                {editingUserId === u.id && (
                  <UserEditRow
                    user={u}
                    userGroups={userGroups}
                    isSelf={u.id === authUser?.sub}
                    onSave={(data) => handleSaveUser(u.id, data)}
                    onCancel={() => setEditingUserId(null)}
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('users.add_section')}</div>
            <input className="form-input" placeholder={t('users.placeholder_username')} value={newUser.username} onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" placeholder={t('users.placeholder_first_name')} value={newUser.first_name} onChange={e => setNewUser(u => ({ ...u, first_name: e.target.value }))} style={{ flex: 1, minWidth: 0 }} />
              <input className="form-input" placeholder={t('users.placeholder_last_name')} value={newUser.last_name} onChange={e => setNewUser(u => ({ ...u, last_name: e.target.value }))} style={{ flex: 1, minWidth: 0 }} />
            </div>
            <input className="form-input" placeholder={t('users.placeholder_email')} type="email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label className="form-label" style={{ fontSize: 11, whiteSpace: 'nowrap', margin: 0 }}>{t('user_edit.group')}</label>
              <select className="form-input" value={newUser.user_group_id} onChange={e => setNewUser(u => ({ ...u, user_group_id: e.target.value }))} style={{ flex: 1, minWidth: 0 }}>
                {[...userGroups].sort((a, b) => a.name.localeCompare(b.name)).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" placeholder={t('users.placeholder_password')} type="password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} style={{ flex: 1, minWidth: 0 }} />
              <button className="btn btn-primary" onClick={handleAddUser} disabled={addingUser} style={{ flexShrink: 0 }}>
                <Plus size={14} /> {t('users.add_button')}
              </button>
            </div>
            {userError && <div style={{ fontSize: 12, color: 'var(--status-offline)' }}>{userError}</div>}
          </div>
        </section>
      )}

      {/* ── Groups ───────────────────────────────────────────────────────────── */}
      {activeTab === 'groups' && isAdmin && (
        <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={15} /> {t('groups.title')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {userGroups.map(g => (
              <div key={g.id} className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {g.name}
                      {g.is_system && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 'var(--radius-sm)', background: 'var(--glass-bg)', color: 'var(--text-muted)', border: '1px solid var(--glass-border)' }}>{t('groups.badge_system')}</span>
                      )}
                      {g.id === 'grp_admin' && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 'var(--radius-sm)', background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.25)' }}>{t('groups.badge_full_access')}</span>
                      )}
                    </div>
                    {g.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.description}</div>}
                  </div>
                  {g.id !== 'grp_admin' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setExpandedGroupId(expandedGroupId === g.id ? null : g.id)} style={{ fontSize: 11, gap: 4, padding: '4px 8px' }}>
                      <Eye size={11} />
                      {expandedGroupId === g.id ? t('visibility.close') : t('visibility.permissions')}
                    </button>
                  )}
                  {!g.is_system && (
                    <button className="btn btn-danger btn-icon btn-sm" onClick={async () => { if (await confirmDlg({ title: t('confirm_delete_group', { name: g.name }), danger: true, confirmLabel: t('common:buttons.delete') })) deleteUserGroup(g.id) }} style={{ padding: '4px', width: 28, height: 28, flexShrink: 0 }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                {expandedGroupId === g.id && g.id !== 'grp_admin' && (
                  <div style={{ borderTop: '1px solid var(--glass-border)' }}>
                    <GroupVisibilityEditor
                      group={g}
                      services={services}
                      arrInstances={arrInstances}
                      widgets={widgets.map(w => ({ id: w.id, name: w.name, type: w.type }))}
                      backgrounds={backgrounds}
                      onSaveApps={(hiddenIds) => updateGroupVisibility(g.id, hiddenIds)}
                      onSaveArr={(hiddenIds) => updateArrVisibility(g.id, hiddenIds)}
                      onSaveWidgets={(hiddenIds) => updateWidgetVisibility(g.id, hiddenIds)}
                      onToggleDockerAccess={(enabled) => updateDockerAccess(g.id, enabled)}
                      onToggleDockerWidgetAccess={(enabled) => updateDockerWidgetAccess(g.id, enabled)}
                      onSetBackground={(bgId) => setGroupBackground(g.id, bgId)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" placeholder={t('groups.placeholder_name')} value={newUG.name} onChange={e => setNewUG(g => ({ ...g, name: e.target.value }))} style={{ flex: 1 }} />
            <input className="form-input" placeholder={t('groups.placeholder_desc')} value={newUG.description} onChange={e => setNewUG(g => ({ ...g, description: e.target.value }))} style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={handleAddUserGroup} style={{ flexShrink: 0 }}>
              <Plus size={14} /> {t('groups.add_button')}
            </button>
          </div>
          {ugError && <div style={{ fontSize: 12, color: 'var(--status-offline)', marginTop: 6 }}>{ugError}</div>}
        </section>
      )}

      {/* ── OIDC / SSO ───────────────────────────────────────────────────────── */}
      {activeTab === 'oidc' && (
        <section className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 24 }}>
          <h3 style={{ marginBottom: 6, fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={15} /> {t('oidc.title')}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
            {t('oidc.desc')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, opacity: 0.45, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('oidc.provider_name')}</label>
                <input className="form-input" placeholder={t('oidc.provider_placeholder')} readOnly />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, userSelect: 'none', marginBottom: 6 }}>
                  <input type="checkbox" readOnly style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                  {t('oidc.enabled')}
                </label>
              </div>
            </div>
            <div>
              <label className="form-label">{t('oidc.issuer_label')}</label>
              <input className="form-input" placeholder="https://auth.example.com/application/o/heldash/" readOnly />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('oidc.client_id')}</label>
                <input className="form-input" placeholder="heldash" readOnly />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('oidc.client_secret')}</label>
                <input className="form-input" type="password" placeholder="••••••••••••••••" readOnly />
              </div>
            </div>
            <div>
              <label className="form-label">{t('oidc.scopes')}</label>
              <input className="form-input" placeholder="openid profile email" readOnly />
            </div>
            <div>
              <label className="form-label">{t('oidc.redirect_uri')}</label>
              <input className="form-input" placeholder="https://heldash.example.com/api/auth/oidc/callback" readOnly />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">{t('oidc.default_group')}</label>
                <select className="form-input" disabled><option>Guest</option></select>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, userSelect: 'none', marginBottom: 6 }}>
                  <input type="checkbox" readOnly style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                  {t('oidc.auto_provision')}
                </label>
              </div>
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled>
              <Check size={14} /> {t('oidc.save')}
            </button>
          </div>

          <div style={{ marginTop: 20, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(var(--accent-rgb), 0.06)', border: '1px solid rgba(var(--accent-rgb), 0.2)', fontSize: 12, color: 'var(--text-secondary)' }}>
            {t('oidc.coming_soon')} <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>oidc_subject</code> and <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>oidc_provider</code> fields.
          </div>
        </section>
      )}

    </div>
  )
}
