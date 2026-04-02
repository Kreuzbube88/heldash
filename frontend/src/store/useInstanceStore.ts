import { create } from 'zustand'
import { api } from '../api'
import type { Instance, InstanceType } from '../types'

interface InstanceState {
  instances: Instance[]
  loading: boolean
  loadInstances: () => Promise<void>
  createInstance: (data: { type: InstanceType; name: string; url: string; token?: string; api_key?: string; enabled?: boolean; icon_id?: string | null }) => Promise<Instance>
  updateInstance: (id: string, data: { name?: string; url?: string; token?: string; api_key?: string; enabled?: boolean; icon_id?: string | null }) => Promise<void>
  deleteInstance: (id: string) => Promise<void>
  testInstance: (id: string) => Promise<{ ok: boolean; error?: string }>
}

export const useInstanceStore = create<InstanceState>((set) => ({
  instances: [],
  loading: false,

  loadInstances: async () => {
    set({ loading: true })
    try {
      const instances = await api.instances.list()
      set({ instances })
    } finally {
      set({ loading: false })
    }
  },

  createInstance: async (data) => {
    const instance = await api.instances.create(data)
    set(state => ({ instances: [...state.instances, instance] }))
    return instance
  },

  updateInstance: async (id, data) => {
    const updated = await api.instances.update(id, data)
    set(state => ({ instances: state.instances.map(i => i.id === id ? updated : i) }))
  },

  deleteInstance: async (id) => {
    await api.instances.delete(id)
    set(state => ({ instances: state.instances.filter(i => i.id !== id) }))
  },

  testInstance: async (id) => {
    return api.instances.test(id)
  },
}))
