import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'

export function AboutPage({ onShowChangelog }: { onShowChangelog?: () => void } = {}) {
  const { t } = useTranslation('about')
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    api.health()
      .then(data => setVersion(data.version ?? '–'))
      .catch(() => setVersion('–'))
  }, [])

  return (
    <div className="content-inner" style={{ paddingTop: 'var(--spacing-2xl)', maxWidth: 700 }}>

      {/* Intro */}
      <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-2xl)', marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xl)', marginBottom: 'var(--spacing-lg)' }}>
          <img src="/logo.png" alt="HELDASH" style={{ width: 64, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', marginBottom: 4 }}>HELDASH</div>
            <span className="badge badge-neutral">
              {t('version')}: {version === null ? <span style={{ opacity: 0.5 }}>…</span> : version}
            </span>
          </div>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', margin: 0 }}>
          {t('intro')}
        </p>
      </div>

      {/* Quick Install */}
      <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-2xl)', marginBottom: 'var(--spacing-xl)' }}>
        <div className="section-header">{t('install.title')}</div>
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2.2, fontSize: 14, color: 'var(--text-secondary)' }}>
          <li>{t('install.step1')}</li>
          <li>{t('install.step2')}</li>
          <li>{t('install.step3')}</li>
          <li>{t('install.step4')}</li>
        </ol>
      </div>

      {/* Links */}
      <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-2xl)', marginBottom: 'var(--spacing-xl)' }}>
        <div className="section-header">{t('links.title')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
          <a
            href="https://github.com/Kreuzbube88/heldash/tree/main/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <ExternalLink size={14} />
            {t('links.docs')}
          </a>
          <a
            href="https://github.com/Kreuzbube88/heldash"
            target="_blank"
            rel="noopener noreferrer"
            className="badge badge-accent"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', cursor: 'pointer' }}
          >
            <ExternalLink size={11} />
            GitHub
          </a>
          {onShowChangelog && (
            <button
              onClick={onShowChangelog}
              className="badge badge-neutral"
              style={{ cursor: 'pointer', background: 'none', border: '1px solid var(--glass-border)', display: 'inline-flex', alignItems: 'center' }}
            >
              {t('changelog.title')}
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
