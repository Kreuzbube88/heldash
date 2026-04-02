import { useState } from 'react'
import { Check, X, ChevronRight, ChevronLeft, LayoutGrid, Sliders, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store/useStore'
import { useArrStore } from '../store/useArrStore'
import { api } from '../api'

interface Props {
  onClose: () => void
  onAddService: () => void
  onAddInstance: () => void
}

export function OnboardingWizard({ onClose, onAddService, onAddInstance }: Props) {
  const { t } = useTranslation('common')
  const [step, setStep] = useState(0)
  const { services } = useStore()
  const { instances } = useArrStore()

  const totalSteps = 5

  const handleSkip = async () => {
    try {
      await api.settings.update({ onboarding_skipped_at: new Date().toISOString() } as Parameters<typeof api.settings.update>[0])
    } catch { /* ignore */ }
    onClose()
  }

  const handleComplete = async () => {
    try {
      await api.settings.update({ onboarding_completed: '1' } as Parameters<typeof api.settings.update>[0])
    } catch { /* ignore */ }
    onClose()
  }

  const dots = Array.from({ length: totalSteps }, (_, i) => i)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--spacing-lg)',
      }}
    >
      <div
        className="glass"
        style={{
          maxWidth: 640, width: '100%',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-2xl)',
          display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={handleSkip}
          style={{ position: 'absolute', top: 16, right: 16 }}
        >
          <X size={16} />
        </button>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {dots.map(i => (
            <div
              key={i}
              style={{
                width: i === step ? 24 : 8, height: 8,
                borderRadius: 4,
                background: i === step ? 'var(--accent)' : i < step ? 'rgba(var(--accent-rgb),0.5)' : 'var(--glass-border)',
                transition: 'all var(--transition-base)',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        {step === 0 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', alignItems: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>👋</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--text-primary)', margin: 0 }}>
              {t('onboarding.step0_title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 460, margin: 0 }}>
              {t('onboarding.step0_subtitle')}
            </p>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <LayoutGrid size={20} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, margin: 0 }}>{t('onboarding.step1_title')}</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {t('onboarding.step1_subtitle')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className={services.length > 0 ? 'badge-success' : 'badge-neutral'} style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                {t(services.length !== 1 ? 'onboarding.step1_count_plural' : 'onboarding.step1_count', { count: services.length })}
              </span>
              <button className="btn btn-ghost" onClick={onAddService} style={{ gap: 6, fontSize: 13 }}>
                {t('onboarding.step1_add')}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Layers size={20} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, margin: 0 }}>{t('onboarding.step2_title')}</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {t('onboarding.step2_subtitle')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className={instances.length > 0 ? 'badge-success' : 'badge-neutral'} style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                {t(instances.length !== 1 ? 'onboarding.step2_count_plural' : 'onboarding.step2_count', { count: instances.length })}
              </span>
              <button className="btn btn-ghost" onClick={onAddInstance} style={{ gap: 6, fontSize: 13 }}>
                {t('onboarding.step2_add')}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Sliders size={20} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, margin: 0 }}>{t('onboarding.step3_title')}</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              {t('onboarding.step3_subtitle')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: '🖥️', name: 'Server Status', desc: t('onboarding.widget_server') },
                { icon: '🛡️', name: 'AdGuard / Pi-hole', desc: t('onboarding.widget_adguard') },
                { icon: '🏠', name: 'Home Assistant', desc: t('onboarding.widget_ha') },
                { icon: '📅', name: 'Kalender', desc: t('onboarding.widget_calendar') },
              ].map(w => (
                <div key={w.name} className="glass" style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{w.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{w.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{w.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
              {t('onboarding.step3_hint')}
            </p>
          </div>
        )}

        {step === 4 && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', alignItems: 'center' }}>
            <div
              style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(var(--accent-rgb), 0.15)',
                border: '2px solid var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Check size={28} style={{ color: 'var(--accent)' }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', margin: 0 }}>
              {t('onboarding.step4_title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, maxWidth: 420, margin: 0 }}>
              {t('onboarding.step4_subtitle')}
            </p>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          {step === 0 ? (
            <button className="btn btn-ghost" onClick={handleSkip} style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {t('onboarding.skip')}
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)} style={{ gap: 6 }}>
              <ChevronLeft size={15} />
              {t('onboarding.back')}
            </button>
          )}

          {step < totalSteps - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} style={{ gap: 6 }}>
              {t('onboarding.next')}
              <ChevronRight size={15} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleComplete} style={{ gap: 6 }}>
              <Check size={15} />
              {t('onboarding.open_dashboard')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
