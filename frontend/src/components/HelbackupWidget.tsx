import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useHelbackupStore } from '../store/useHelbackupStore'
import { useInstanceStore } from '../store/useInstanceStore'
import { getIconUrl } from '../api'

export function HelbackupWidget() {
  const { t } = useTranslation('backup')
  const { instances } = useInstanceStore()
  const { status, backups, backupsError, loading, error, fetchAll } = useHelbackupStore()

  const helbackupInstance = instances.find(i => i.type === 'helbackup' && i.enabled)

  useEffect(() => {
    if (!helbackupInstance) return
    fetchAll().catch(() => {})
    const interval = setInterval(() => { fetchAll().catch(() => {}) }, 60_000)
    return () => clearInterval(interval)
  }, [helbackupInstance?.id])

  if (!helbackupInstance) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
        {t('helbackup.not_configured')}
      </div>
    )
  }

  if (loading && !status) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
        <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
      </div>
    )
  }

  if (error && !status) {
    return (
      <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--status-offline)' }}>
        {t('helbackup.connection_error')}
      </div>
    )
  }

  if (!status) return null

  const statusColor = status.status === 'ok' ? 'var(--status-online)' : 'var(--status-offline)'
  const iconUrl = getIconUrl(helbackupInstance)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {iconUrl && (
          <img src={iconUrl} alt="HELBACKUP" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} />
        )}
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '2px 6px',
          borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.15)',
          color: '#10b981', border: '1px solid rgba(16,185,129,0.3)',
          textTransform: 'uppercase', flexShrink: 0,
        }}>HELBACKUP</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: status.status === 'ok' ? `0 0 6px ${statusColor}` : 'none', display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}>
            {status.status === 'ok' ? t('helbackup.status_healthy') : t('helbackup.status_warning')}
          </span>
        </div>
      </div>

      {/* 24h stats */}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
          {t('helbackup.last_24h')}
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
          <span style={{ color: 'var(--status-online)' }}>✓ {status.last24h.success}</span>
          <span style={{ color: 'var(--status-offline)' }}>✗ {status.last24h.failed}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{status.jobs} {t('helbackup.active_jobs')}</span>
        </div>
      </div>

      {/* Recent backups */}
      {(backups.length > 0 || backupsError) && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
            {t('helbackup.recent_backups')}
          </div>
          {backupsError ? (
            <div style={{ fontSize: 11, color: 'var(--status-offline)' }}>{backupsError}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {backups.slice(0, 2).map(backup => (
                <div key={backup.id} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                    {backup.target_name ?? backup.job_name ?? '—'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    {formatTimeAgo(new Date(backup.timestamp))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString()
}
