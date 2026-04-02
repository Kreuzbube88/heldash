import { useState } from 'react'
import { useStore } from '../store/useStore'
import { useTranslation } from 'react-i18next'
import { useLanguageStore } from '../store/useLanguageStore'

type SetupStep = 'language' | 'account'

export function SetupPage() {
  const { setupAdmin } = useStore()
  const { t } = useTranslation('setup')
  const { language, setLanguage } = useLanguageStore()
  const [step, setStep] = useState<SetupStep>('language')
  const [form, setForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.username.trim()) return setError(t('errors.username_required'))
    if (!form.first_name.trim()) return setError(t('errors.first_name_required'))
    if (!form.last_name.trim()) return setError(t('errors.last_name_required'))
    if (form.password.length < 8) return setError(t('errors.password_min_length'))
    if (form.password !== form.confirm) return setError(t('errors.passwords_no_match'))

    setLoading(true)
    try {
      await setupAdmin({
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
      })
    } catch (err: unknown) {
      setError((err as Error).message ?? t('errors.setup_failed'))
    } finally {
      setLoading(false)
    }
  }

  if (step === 'language') {
    return (
      <div className="setup-page">
        <div className="setup-card glass">
          <div className="setup-logo">
            <img src="/favicon.png" alt="" className="setup-logo-icon" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span className="setup-logo-text">HELDASH</span>
          </div>
          <h2 className="setup-title">{t('language_step.title')}</h2>
          <p className="setup-subtitle">{t('language_step.subtitle')}</p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <button
              className="btn btn-ghost"
              onClick={() => setLanguage('de')}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: 15,
                border: language === 'de' ? '2px solid var(--accent)' : '2px solid var(--glass-border)',
                background: language === 'de' ? 'var(--accent-subtle)' : 'transparent',
              }}
            >
              🇩🇪 Deutsch
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setLanguage('en')}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: 15,
                border: language === 'en' ? '2px solid var(--accent)' : '2px solid var(--glass-border)',
                background: language === 'en' ? 'var(--accent-subtle)' : 'transparent',
              }}
            >
              🇬🇧 English
            </button>
          </div>

          <button className="btn btn-primary" onClick={() => setStep('account')} style={{ width: '100%' }}>
            {t('language_step.continue')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="setup-page">
      <div className="setup-card glass">
        <div className="setup-logo">
          <img src="/favicon.png" alt="" className="setup-logo-icon" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <span className="setup-logo-text">HELDASH</span>
        </div>
        <h2 className="setup-title">{t('account_step.title')}</h2>
        <p className="setup-subtitle">
          {t('account_step.subtitle')}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">{t('account_step.username')}</label>
            <input className="form-input" value={form.username} onChange={update('username')} autoFocus autoComplete="username" />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">{t('account_step.first_name')}</label>
              <input className="form-input" value={form.first_name} onChange={update('first_name')} autoComplete="given-name" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">{t('account_step.last_name')}</label>
              <input className="form-input" value={form.last_name} onChange={update('last_name')} autoComplete="family-name" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('account_step.email')} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{t('common:form.optional', { ns: 'common' })}</span></label>
            <input className="form-input" type="email" value={form.email} onChange={update('email')} autoComplete="email" />
          </div>

          <div className="form-group">
            <label className="form-label">{t('account_step.password')}</label>
            <input className="form-input" type="password" value={form.password} onChange={update('password')} autoComplete="new-password" />
          </div>

          <div className="form-group">
            <label className="form-label">{t('account_step.confirm_password')}</label>
            <input className="form-input" type="password" value={form.confirm} onChange={update('confirm')} autoComplete="new-password" />
          </div>

          {error && (
            <div className="setup-error">{error}</div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> {t('account_step.submitting')}</> : t('account_step.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
