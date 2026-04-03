import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Clock } from 'lucide-react'
import { api } from '../api'
import type { HaEntityFull, HaHistoryEntry } from '../types'

interface Props {
  entity: HaEntityFull
  instanceId: string
  onClose: () => void
}

const HOUR_OPTIONS = [6, 24, 168, 720]

function isNumeric(value: string): boolean {
  return value !== '' && !isNaN(parseFloat(value)) && isFinite(Number(value))
}

function formatTime(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('de-DE', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// Simple SVG line chart for numeric history
function NumericChart({ entries }: { entries: HaHistoryEntry[] }) {
  if (entries.length < 2) return null

  const values = entries.map(e => parseFloat(e.state)).filter(v => !isNaN(v))
  if (values.length < 2) return null

  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  const W = 560
  const H = 100
  const PAD = 8

  const points = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (v - minVal) / range) * (H - PAD * 2)
    return `${x},${y}`
  })

  const avg = values.reduce((a, b) => a + b, 0) / values.length

  return (
    <div style={{ marginBottom: 16 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 110, display: 'block' }}>
        {/* Area fill */}
        <defs>
          <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polyline
          points={[
            `${PAD},${H - PAD}`,
            ...points,
            `${W - PAD},${H - PAD}`,
          ].join(' ')}
          fill="url(#histGrad)"
          stroke="none"
        />
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
        <span>Min: <strong style={{ color: 'var(--text-primary)' }}>{Math.min(...values).toFixed(1)}</strong></span>
        <span>Max: <strong style={{ color: 'var(--text-primary)' }}>{Math.max(...values).toFixed(1)}</strong></span>
        <span>Ø: <strong style={{ color: 'var(--text-primary)' }}>{avg.toFixed(1)}</strong></span>
      </div>
    </div>
  )
}

// Color bands chart for state history
function StateChart({ entries }: { entries: HaHistoryEntry[] }) {
  if (entries.length === 0) return null

  const W = 560
  const H = 32

  const stateColors: Record<string, string> = {
    on: 'var(--status-online)',
    off: 'var(--text-muted)',
    open: 'var(--status-online)',
    closed: 'var(--text-muted)',
    locked: 'var(--status-offline)',
    unlocked: 'var(--status-online)',
    playing: 'var(--status-online)',
    paused: 'var(--text-muted)',
    unavailable: 'var(--surface-3)',
    unknown: 'var(--surface-3)',
  }

  if (entries.length === 0) return null
  const first = entries[0]
  const last = entries[entries.length - 1]
  if (!first || !last) return null
  const tStart = new Date(first.last_changed).getTime()
  const tEnd = new Date(last.last_changed).getTime() || tStart + 1

  return (
    <div style={{ marginBottom: 16 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H + 10, display: 'block' }}>
        {entries.map((entry, i) => {
          const nextEntry = entries[i + 1]
          const t0 = new Date(entry.last_changed).getTime()
          const t1 = nextEntry ? new Date(nextEntry.last_changed).getTime() : tEnd
          const x = ((t0 - tStart) / (tEnd - tStart)) * W
          const w = Math.max(2, ((t1 - t0) / (tEnd - tStart)) * W)
          const color = stateColors[entry.state] ?? 'var(--accent)'
          return (
            <rect key={i} x={x} y={0} width={w} height={H} fill={color} opacity={0.75}>
              <title>{entry.state} – {formatTime(entry.last_changed)}</title>
            </rect>
          )
        })}
      </svg>
    </div>
  )
}

export function HaEntityHistory({ entity, instanceId, onClose }: Props) {
  const { t } = useTranslation('ha')
  const [hours, setHours] = useState(24)
  const [entries, setEntries] = useState<HaHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadHistory = async (h: number) => {
    setLoading(true)
    setError('')
    try {
      const data = await api.ha.history(instanceId, entity.entity_id, h)
      setEntries(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('entity_history.error_loading'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory(hours)
  }, [])

  const handleHoursChange = (h: number) => {
    setHours(h)
    loadHistory(h)
  }

  const numeric = entries.length > 0 && isNumeric(entries[0]?.state ?? '')
  const name = (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id
  const unit = (entity.attributes.unit_of_measurement as string | undefined) ?? ''

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="glass"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 600,
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
          animation: 'slide-up var(--transition-base)',
          position: 'relative',
          maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }}>
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Clock size={16} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            {t('entity_history.title', { name })}
          </h2>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 20 }}>
          {entity.entity_id}
        </div>

        {/* Time range selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {HOUR_OPTIONS.map(h => (
            <button
              key={h}
              className={`btn ${hours === h ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => handleHoursChange(h)}
            >
              {t(`entity_history.period.${h}`)}
            </button>
          ))}
          {loading && <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, alignSelf: 'center', marginLeft: 8 }} />}
        </div>

        {error && <div className="setup-error" style={{ marginBottom: 12 }}>{error}</div>}

        {!loading && !error && (
          <>
            {numeric
              ? <NumericChart entries={entries} />
              : <StateChart entries={entries} />
            }

            {/* State changes table */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {entries.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
                  {t('entity_history.no_data')}
                </p>
              ) : (
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '4px 8px', fontWeight: 600 }}>{t('entity_history.col_time')}</th>
                      <th style={{ padding: '4px 8px', fontWeight: 600 }}>{t('entity_history.col_status')}{unit ? ` (${unit})` : ''}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice().reverse().map((entry, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--glass-border)', opacity: 0.85 }}>
                        <td style={{ padding: '4px 8px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                          {formatTime(entry.last_changed)}
                        </td>
                        <td style={{ padding: '4px 8px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {entry.state}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
