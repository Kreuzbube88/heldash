import { create } from 'zustand'
import { api } from '../api'
import type {
  TRaSHProfile,
  TrashInstanceConfig,
  TrashFormatListEntry,
  TrashChangeset,
  TrashApplyResult,
} from '../types/trash'

interface TrashState {
  profiles: Record<string, TRaSHProfile[]>
  configs: Record<string, TrashInstanceConfig>
  formatLists: Record<string, TrashFormatListEntry[]>
  previews: Record<string, TrashChangeset>
  customFormats: Record<string, Array<{ id: string; name: string; specifications: object[]; instance_id: string }>>
  loading: Record<string, boolean>
  applying: Record<string, boolean>
  cacheInfo: { fetchedAt: string | null; fromCache: boolean } | null

  loadProfiles: (instanceId: string) => Promise<void>
  loadConfig: (instanceId: string) => Promise<void>
  saveProfileSlug: (instanceId: string, slug: string | null) => Promise<void>
  loadFormatList: (instanceId: string) => Promise<void>
  loadCustomFormats: (instanceId: string) => Promise<void>
  saveOverrides: (instanceId: string, overrides: Array<{ format_slug: string; score_override: number | null; excluded: boolean }>) => Promise<void>
  createCustomFormat: (instanceId: string, name: string, specifications: object[]) => Promise<void>
  updateCustomFormat: (instanceId: string, cfId: string, name: string, specifications: object[]) => Promise<void>
  deleteCustomFormat: (instanceId: string, cfId: string) => Promise<void>
  loadPreview: (instanceId: string) => Promise<void>
  applyChangeset: (instanceId: string) => Promise<TrashApplyResult>
  refreshGithub: () => Promise<void>
  loadCacheInfo: () => Promise<void>
}

export const useTrashStore = create<TrashState>((set, get) => ({
  profiles: {},
  configs: {},
  formatLists: {},
  previews: {},
  customFormats: {},
  loading: {},
  applying: {},
  cacheInfo: null,

  loadProfiles: async (instanceId) => {
    set(s => ({ loading: { ...s.loading, [`profiles_${instanceId}`]: true } }))
    try {
      const profiles = await api.trash.profiles(instanceId)
      set(s => ({ profiles: { ...s.profiles, [instanceId]: profiles } }))
    } finally {
      set(s => ({ loading: { ...s.loading, [`profiles_${instanceId}`]: false } }))
    }
  },

  loadConfig: async (instanceId) => {
    const config = await api.trash.config(instanceId)
    set(s => ({ configs: { ...s.configs, [instanceId]: config } }))
  },

  saveProfileSlug: async (instanceId, slug) => {
    await api.trash.saveConfig(instanceId, slug)
    set(s => ({ configs: { ...s.configs, [instanceId]: { profile_slug: slug } } }))
  },

  loadFormatList: async (instanceId) => {
    set(s => ({ loading: { ...s.loading, [`formats_${instanceId}`]: true } }))
    try {
      const list = await api.trash.formatList(instanceId)
      set(s => ({ formatLists: { ...s.formatLists, [instanceId]: list } }))
    } finally {
      set(s => ({ loading: { ...s.loading, [`formats_${instanceId}`]: false } }))
    }
  },

  loadCustomFormats: async (instanceId) => {
    const cfs = await api.trash.customFormats(instanceId)
    set(s => ({ customFormats: { ...s.customFormats, [instanceId]: cfs } }))
  },

  saveOverrides: async (instanceId, overrides) => {
    await api.trash.saveOverrides(instanceId, overrides)
    // Reload format list to reflect changes
    await get().loadFormatList(instanceId)
  },

  createCustomFormat: async (instanceId, name, specifications) => {
    await api.trash.createCustomFormat(instanceId, name, specifications)
    await get().loadCustomFormats(instanceId)
    await get().loadFormatList(instanceId)
  },

  updateCustomFormat: async (instanceId, cfId, name, specifications) => {
    await api.trash.updateCustomFormat(instanceId, cfId, name, specifications)
    await get().loadCustomFormats(instanceId)
    await get().loadFormatList(instanceId)
  },

  deleteCustomFormat: async (instanceId, cfId) => {
    await api.trash.deleteCustomFormat(instanceId, cfId)
    await get().loadCustomFormats(instanceId)
    await get().loadFormatList(instanceId)
  },

  loadPreview: async (instanceId) => {
    set(s => ({ loading: { ...s.loading, [`preview_${instanceId}`]: true } }))
    try {
      const preview = await api.trash.preview(instanceId)
      set(s => ({ previews: { ...s.previews, [instanceId]: preview } }))
    } finally {
      set(s => ({ loading: { ...s.loading, [`preview_${instanceId}`]: false } }))
    }
  },

  applyChangeset: async (instanceId) => {
    set(s => ({ applying: { ...s.applying, [instanceId]: true } }))
    try {
      return await api.trash.apply(instanceId)
    } finally {
      set(s => ({ applying: { ...s.applying, [instanceId]: false } }))
    }
  },

  refreshGithub: async () => {
    await api.trash.refreshGithub()
    await get().loadCacheInfo()
  },

  loadCacheInfo: async () => {
    const info = await api.trash.cacheInfo()
    set({ cacheInfo: info })
  },
}))
