import { useState, useRef, useEffect } from 'react'
import { Search, Upload, X, Image } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'

interface IconSearchResult {
  name: string
  base: string
  preview_url: string
  categories: string[]
}

interface IconPickerProps {
  iconId: string | null
  iconUrl: string | null
  onChange: (iconId: string | null) => void
}

export function IconPicker({ iconId, iconUrl, onChange }: IconPickerProps) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'search' | 'upload'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<IconSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const previewUrl = iconId ? `/api/icons/${iconId}` : iconUrl

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setSearchError(null)
      setUploadError(null)
    }
  }, [open])

  const handleQueryChange = (q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      try {
        const res = await api.icons.search(q.trim())
        setResults(res.icons)
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : t('icon_picker.error_search'))
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  const handleSelectIcon = async (icon: IconSearchResult) => {
    setDownloading(icon.name)
    try {
      const res = await api.icons.download(icon.name)
      onChange(res.id)
      setOpen(false)
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : t('icon_picker.error_download'))
    } finally {
      setDownloading(null)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (file.size > 512 * 1024) { setUploadError(t('icon_picker.error_too_large')); return }
    const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!validTypes.includes(file.type)) { setUploadError(t('icon_picker.error_unsupported')); return }
    setUploadError(null)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      try {
        const res = await api.icons.upload(base64, file.type, file.name.replace(/\.[^.]+$/, ''))
        onChange(res.id)
        setOpen(false)
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : t('icon_picker.error_upload'))
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {previewUrl ? (
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            <img src={previewUrl} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Image size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)} style={{ gap: 4 }}>
          {previewUrl ? t('icon_picker.change') : t('icon_picker.choose')}
        </button>
        {previewUrl && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)} style={{ color: 'var(--text-muted)', padding: '4px 8px' }}>
            <X size={12} />
          </button>
        )}
      </div>

      {open && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }} style={{ zIndex: 1100 }}>
          <div className="glass modal" style={{ width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16 }}>{t('icon_picker.modal_title')}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', gap: 4, padding: '12px 20px 0' }}>
              {(['search', 'upload'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  type="button"
                  className={`btn btn-sm ${tab === tabKey ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTab(tabKey)}
                  style={{ fontSize: 12 }}
                >
                  {tabKey === 'search' ? t('icon_picker.tab_search') : t('icon_picker.tab_upload')}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '12px 20px 20px' }}>
              {tab === 'search' && (
                <>
                  <div style={{ position: 'relative', marginBottom: 12 }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      className="form-input"
                      style={{ paddingLeft: 32 }}
                      placeholder={t('icon_picker.search_placeholder')}
                      value={query}
                      onChange={e => handleQueryChange(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {searchError && <div style={{ color: 'var(--status-offline)', fontSize: 12, marginBottom: 8 }}>{searchError}</div>}
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {searching && (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                        <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                      </div>
                    )}
                    {!searching && !query.trim() && (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('icon_picker.search_hint')}
                      </div>
                    )}
                    {!searching && query.trim() && results.length === 0 && !searchError && (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('icon_picker.no_results', { query })}
                      </div>
                    )}
                    {!searching && results.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
                        {results.map(icon => (
                          <button
                            key={icon.name}
                            type="button"
                            className="icon-picker-item"
                            onClick={() => handleSelectIcon(icon)}
                            disabled={downloading === icon.name}
                            title={icon.name}
                          >
                            {downloading === icon.name ? (
                              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                            ) : (
                              <img src={icon.preview_url} alt={icon.name} loading="lazy" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                            )}
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>{icon.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {tab === 'upload' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {uploadError && <div style={{ color: 'var(--status-offline)', fontSize: 12 }}>{uploadError}</div>}
                  <div
                    className="icon-picker-dropzone"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}
                  >
                    <Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('icon_picker.dropzone_label')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t('icon_picker.dropzone_hint')}</div>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
