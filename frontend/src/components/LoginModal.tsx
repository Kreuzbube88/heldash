import { useState } from 'react'
import { useStore } from '../store/useStore'
import { X } from 'lucide-react'

interface Props {
  onClose: () => void
}

export function LoginModal({ onClose }: Props) {
  const { login } = useStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) return setError('Username and password required')
    setLoading(true)
    try {
      await login(username.trim(), password)
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box glass" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Login</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="setup-error">{error}</div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Logging in...</> : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
