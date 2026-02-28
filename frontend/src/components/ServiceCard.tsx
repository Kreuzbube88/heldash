import { useState } from 'react'
import type { Service } from '../types'
import { useStore } from '../store/useStore'
import { ExternalLink, RefreshCw, Pencil, Trash2 } from 'lucide-react'

interface Props {
  service: Service
  onEdit: (service: Service) => void
}

export function ServiceCard({ service, onEdit }: Props) {
  const { checkService, deleteService } = useStore()
  const [checking, setChecking] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const status = service.last_status ?? 'unknown'

  const handleCheck = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setChecking(true)
    try {
      await checkService(service.id)
    } catch {
      // ignore – status stays unchanged on error
    } finally {
      setChecking(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm(`Delete "${service.name}"?`)) {
      await deleteService(service.id)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onEdit(service)
  }

  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="service-card glass"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Action buttons */}
      <div style={{
        position: 'absolute',
        top: 8, right: 8,
        display: 'flex',
        gap: 4,
        opacity: showActions ? 1 : 0,
        transition: 'opacity 150ms ease',
        zIndex: 2,
      }}>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={handleCheck}
          data-tooltip="Check status"
          style={{ padding: '4px', width: '26px', height: '26px' }}
        >
          {checking
            ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
            : <RefreshCw size={12} />
          }
        </button>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={handleEdit}
          data-tooltip="Edit"
          style={{ padding: '4px', width: '26px', height: '26px' }}
        >
          <Pencil size={12} />
        </button>
        <button
          className="btn btn-danger btn-icon btn-sm"
          onClick={handleDelete}
          data-tooltip="Delete"
          style={{ padding: '4px', width: '26px', height: '26px' }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="service-card-header">
        <div className="service-icon">
          {service.icon ?? '🔗'}
        </div>
        <div
          className={`service-status ${status}`}
          data-tooltip={status}
        />
      </div>

      <div>
        <div className="service-name">{service.name}</div>
        {service.description && (
          <div className="service-description">{service.description}</div>
        )}
        <div className="service-url">{service.url.replace(/^https?:\/\//, '')}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
        <ExternalLink size={11} style={{ color: 'var(--text-muted)' }} />
        {service.last_checked && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {new Date(service.last_checked + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </a>
  )
}
