import { create } from 'zustand'
import { api } from '../api'
import type {
  RecyclarrTemplate,
  RecyclarrInstanceConfig,
  RecyclarrCfEntry,
  RecyclarrScoreOverride,
  RecyclarrUserCf,
} from '../types/recyclarr'

interface RecyclarrState {
  templates: RecyclarrTemplate[]
  configs: RecyclarrInstanceConfig[]
  cfLists: Record<string, RecyclarrCfEntry[]>
  syncLog: string
  syncing: boolean
  loading: boolean

  loadTemplates: () => Promise<void>
  loadConfigs: () => Promise<void>
  saveConfig: (instanceId: string, data: {
    enabled: boolean
    templates: string[]
    scoreOverrides: RecyclarrScoreOverride[]
    userCfNames: RecyclarrUserCf[]
  }) => Promise<void>
  loadCfList: (instanceId: string) => Promise<void>
  sync: (instanceId?: string) => Promise<void>
  refreshCache: () => Promise<void>
}

export const useRecyclarrStore = create<RecyclarrState>((set, get) => ({
  templates: [],
  configs: [],
  cfLists: {},
  syncLog: '',
  syncing: false,
  loading: false,

  loadTemplates: async () => {
    const data = await api.recyclarr.templates()
    set({ templates: data })
  },

  loadConfigs: async () => {
    set({ loading: true })
    try {
      const data = await api.recyclarr.configs()
      set({ configs: data })
    } finally {
      set({ loading: false })
    }
  },

  saveConfig: async (instanceId, data) => {
    await api.recyclarr.saveConfig(instanceId, data)
    await get().loadConfigs()
  },

  loadCfList: async (instanceId) => {
    const data = await api.recyclarr.cfList(instanceId)
    set(s => ({ cfLists: { ...s.cfLists, [instanceId]: data } }))
  },

  sync: async (instanceId) => {
    set({ syncing: true, syncLog: '' })
    try {
      const result = await api.recyclarr.sync(instanceId)
      set({ syncLog: result.output || result.error || 'Done' })
    } catch (e: unknown) {
      set({ syncLog: e instanceof Error ? e.message : String(e) })
    } finally {
      set({ syncing: false })
    }
  },

  refreshCache: async () => {
    await api.recyclarr.refreshCache()
  },
}))
