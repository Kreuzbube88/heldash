import { useEffect, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, ExternalLink, Upload, X, Download, LayoutDashboard } from 'lucide-react'
import { useBookmarkStore } from '../store/useBookmarkStore'
import { useStore } from '../store/useStore'
import { useConfirm } from '../components/ConfirmDialog'
import type { Bookmark } from '../types'

// ── Bookmark modal (add/edit) ─────────────────────────────────────────────────

function BookmarkModal({
  bookmark,
  onClose,
  onSave,
}: {
  bookmark?: Bookmark | null
  onClose: () => void
  onSave: (name: string, url: string, description: string, file?: File) => Promise<void>
}) {
  const [name, setName] = useState(bookmark?.name ?? '')
  const [url, setUrl] = useState(bookmark?.url ?? '')
  const [description, setDescription] = useState(bookmark?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(bookmark?.icon_url ?? null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setPendingFile(file)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!name.trim()) return setError('Name is required')
    if (!url.trim()) return setError('URL is required')
    setSaving(true)
    setError(null)
    try {
      await onSave(name.trim(), url.trim(), description.trim(), pendingFile ?? undefined)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="glass modal" style={{ width: '100%', maxWidth: 440, padding: 24, borderRadius: 'var(--radius-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>{bookmark ? 'Bookmark bearbeiten' : 'Bookmark hinzufügen'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="field-label">Name *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Mein Link" />
          </div>
          <div>
            <label className="field-label">URL *</label>
            <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
          </div>
          <div>
            <label className="field-label">Beschreibung</label>
            <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="field-label">Icon</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {preview && (
                <img src={preview} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--glass-border)' }} />
              )}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} style={{ gap: 6 }}>
                <Upload size={12} /> {preview ? 'Ändern' : 'Hochladen'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bookmark card ─────────────────────────────────────────────────────────────

function BookmarkCard({
  bookmark,
  isAdmin,
  isAuthenticated,
  onEdit,
  onDelete,
  onToggleDashboard,
}: {
  bookmark: Bookmark
  isAdmin: boolean
  isAuthenticated: boolean
  onEdit: () => void
  onDelete: () => void
  onToggleDashboard: () => void
}) {
  const onDashboard = bookmark.show_on_dashboard !== 0
  return (
    <div
      className="glass"
      style={{ borderRadius: 'var(--radius-md)', padding: '14px 16px', position: 'relative', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'var(--transition-base)' }}
      onClick={() => window.open(bookmark.url, '_blank', 'noopener,noreferrer')}
    >
      <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
        {bookmark.icon_url ? (
          <img src={bookmark.icon_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        ) : (
          <ExternalLink size={16} style={{ color: 'var(--text-muted)' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bookmark.name}</div>
        {bookmark.description ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bookmark.description}</div>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bookmark.url}</div>
        )}
      </div>
      {isAuthenticated && (
        <div
          className="bookmark-actions"
          style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity var(--transition-fast)', position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}
        >
          <button
            className="btn-icon"
            onClick={e => { e.stopPropagation(); onToggleDashboard() }}
            title={onDashboard ? 'Vom Dashboard entfernen' : 'Zum Dashboard hinzufügen'}
            style={{ color: onDashboard ? 'var(--accent)' : undefined }}
          >
            <LayoutDashboard size={13} />
          </button>
          {isAdmin && (
            <>
              <button className="btn-icon" onClick={e => { e.stopPropagation(); onEdit() }} title="Bearbeiten"><Pencil size={13} /></button>
              <button className="btn-icon" onClick={e => { e.stopPropagation(); onDelete() }} title="Löschen" style={{ color: 'var(--status-offline)' }}><Trash2 size={13} /></button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── BookmarksPage ─────────────────────────────────────────────────────────────

export function BookmarksPage() {
  const { bookmarks, loading, loadBookmarks, createBookmark, updateBookmark, deleteBookmark, uploadIcon, toggleDashboard, exportBookmarks, importBookmarks } = useBookmarkStore()
  const { isAdmin, isAuthenticated } = useStore()
  const { confirm } = useConfirm()
  const [showModal, setShowModal] = useState(false)
  const [editBookmark, setEditBookmark] = useState<Bookmark | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadBookmarks().catch(e => setError(e instanceof Error ? e.message : 'Fehler beim Laden')) }, [])

  const handleSave = async (name: string, url: string, description: string, file?: File) => {
    if (editBookmark) {
      await updateBookmark(editBookmark.id, { name, url, description: description || undefined })
      if (file) await uploadIcon(editBookmark.id, file)
    } else {
      const bm = await createBookmark(name, url, description || undefined)
      if (file) await uploadIcon(bm.id, file)
    }
  }

  const handleDelete = async (bookmark: Bookmark) => {
    const ok = await confirm({ title: 'Bookmark löschen', message: `"${bookmark.name}" wirklich löschen?`, confirmLabel: 'Löschen', danger: true })
    if (!ok) return
    try {
      await deleteBookmark(bookmark.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Löschen')
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportBookmarks()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export fehlgeschlagen')
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setError(null)
    try {
      const result = await importBookmarks(file)
      const msg = `${result.imported} importiert, ${result.skipped} übersprungen`
      if (result.errors.length > 0) setError(`${msg}. Fehler: ${result.errors.join(', ')}`)
      else setError(null)
      // Show brief success feedback via error state (reuse for simplicity)
      if (result.errors.length === 0) {
        // no-op — bookmarks already reloaded in store
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import fehlgeschlagen')
    } finally {
      setImporting(false)
    }
  }

  const sortedBookmarks = [...bookmarks].sort((a, b) => a.name.localeCompare(b.name))

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)' }}>Bookmarks</h2>
          {error && <div className="error-banner" style={{ marginTop: 8 }}>{error}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isAdmin && (
            <>
              <button onClick={handleExport} disabled={exporting} className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
                <Download size={14} /> Export
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
                <Upload size={14} /> Import
              </button>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
            </>
          )}
          {isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => { setEditBookmark(null); setShowModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} /> Bookmark hinzufügen
            </button>
          )}
        </div>
      </div>

      {sortedBookmarks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Noch keine Bookmarks</h3>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Ersten Bookmark hinzufügen</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
          {sortedBookmarks.map(bm => (
            <BookmarkCard
              key={bm.id}
              bookmark={bm}
              isAdmin={isAdmin}
              isAuthenticated={isAuthenticated}
              onEdit={() => { setEditBookmark(bm); setShowModal(true) }}
              onDelete={() => handleDelete(bm)}
              onToggleDashboard={() => toggleDashboard(bm.id, bm.show_on_dashboard === 0)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <BookmarkModal
          bookmark={editBookmark}
          onClose={() => { setShowModal(false); setEditBookmark(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
