import { useState } from 'react'
import { useStore } from '../store/useStore'
import { useDashboardStore } from '../store/useDashboardStore'
import { X, LogIn } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
  onClose: () => void
}

export function LoginModal({ onClose }: Props) {
  const { t } = useTranslation('common')
  const { login, loadAll } = useStore()
  const { loadDashboard } = useDashboardStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) return setError(t('login.username_password_required'))
    setLoading(true)
    try {
      await login(username.trim(), password, rememberMe)
      await Promise.all([loadAll(), loadDashboard()])
      onClose()
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 'var(--radius-xl)',
          padding: '40px 40px 36px',
          animation: 'slide-up var(--transition-base)',
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16 }}
        >
          <X size={16} />
        </button>

        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <img src="/favicon.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, color: 'var(--text-primary)' }}>
            HELDASH
          </span>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
          {t('login.welcome_back')}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 32 }}>
          {t('login.sign_in_subtitle')}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('login.username')}</label>
            <input
              className="form-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              style={{ fontSize: 14, padding: '10px 12px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('login.password')}</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ fontSize: 14, padding: '10px 12px' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 14, height: 14, cursor: 'pointer' }}
            />
            {t('login.remember_me')}
          </label>

          {error && (
            <div className="setup-error">{error}</div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: 8, padding: '11px 20px', fontSize: 14, gap: 8, justifyContent: 'center' }}
          >
            {loading
              ? <><div className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> {t('login.signing_in')}</>
              : <><LogIn size={15} /> {t('login.sign_in')}</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}
