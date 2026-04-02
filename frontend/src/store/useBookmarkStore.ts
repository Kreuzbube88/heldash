import { create } from 'zustand'
import { api } from '../api'
import type { Bookmark } from '../types'

interface BookmarkState {
  bookmarks: Bookmark[]
  loading: boolean
  loadBookmarks: () => Promise<void>
  createBookmark: (name: string, url: string) => Promise<Bookmark>
  updateBookmark: (id: string, data: { name?: string; url?: string }) => Promise<void>
  deleteBookmark: (id: string) => Promise<void>
  uploadIcon: (id: string, file: File) => Promise<void>
}

export const useBookmarkStore = create<BookmarkState>((set) => ({
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

  createBookmark: async (name, url) => {
    const bookmark = await api.bookmarks.create(name, url)
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
}))
