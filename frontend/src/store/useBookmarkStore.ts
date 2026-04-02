import { create } from 'zustand'
import { api } from '../api'
import type { Bookmark } from '../types'

interface BookmarkState {
  bookmarks: Bookmark[]
  loading: boolean
  loadBookmarks: () => Promise<void>
  createBookmark: (name: string, url: string, description?: string) => Promise<Bookmark>
  updateBookmark: (id: string, data: { name?: string; url?: string; description?: string; icon_id?: string | null }) => Promise<void>
  deleteBookmark: (id: string) => Promise<void>
  uploadIcon: (id: string, file: File) => Promise<void>
  toggleDashboard: (id: string, show: boolean) => Promise<void>
  exportBookmarks: () => Promise<void>
  importBookmarks: (file: File) => Promise<{ imported: number; skipped: number; errors: string[] }>
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  loading: false,

  loadBookmarks: async () => {
    set({ loading: true })
    try {
      const bookmarks = await api.bookmarks.list()
      set({ bookmarks })
    } finally {
      set({ loading: false })
    }
  },

  createBookmark: async (name, url, description) => {
    const bookmark = await api.bookmarks.create(name, url, description)
    set(state => ({ bookmarks: [...state.bookmarks, bookmark] }))
    return bookmark
  },

  updateBookmark: async (id, data) => {
    const updated = await api.bookmarks.update(id, data)
    set(state => ({ bookmarks: state.bookmarks.map(b => b.id === id ? updated : b) }))
  },

  deleteBookmark: async (id) => {
    await api.bookmarks.delete(id)
    set(state => ({ bookmarks: state.bookmarks.filter(b => b.id !== id) }))
  },

  uploadIcon: async (id, file) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const { icon_url } = await api.bookmarks.uploadIcon(id, base64, file.type)
    set(state => ({ bookmarks: state.bookmarks.map(b => b.id === id ? { ...b, icon_url } : b) }))
  },

  toggleDashboard: async (id, show) => {
    await api.bookmarks.toggleDashboard(id, show)
    set(state => ({
      bookmarks: state.bookmarks.map(b => b.id === id ? { ...b, show_on_dashboard: show ? 1 : 0 } : b),
    }))
  },

  exportBookmarks: async () => {
    const blob = await api.bookmarks.export()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `heldash-bookmarks-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  importBookmarks: async (file) => {
    const text = await file.text()
    const data = JSON.parse(text) as { bookmarks?: unknown }
    if (!Array.isArray(data.bookmarks)) {
      throw new Error('Invalid file format: expected { bookmarks: [...] }')
    }
    const result = await api.bookmarks.import(data.bookmarks as Array<{ name: string; url: string; description?: string }>)
    await get().loadBookmarks()
    return result
  },
}))
