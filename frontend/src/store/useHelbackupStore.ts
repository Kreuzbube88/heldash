import { create } from 'zustand'
import { api } from '../api'
import type { HelbackupWidgetStatus, HelbackupJob, HelbackupBackup } from '../types'

interface HelbackupState {
  status: HelbackupWidgetStatus | null
  jobs: HelbackupJob[]
  backups: HelbackupBackup[]
  loading: boolean
  error: string | null
  lastUpdate: Date | null
  triggeringJobId: string | null
  fetchAll: () => Promise<void>
  triggerJob: (jobId: string) => Promise<{ success: boolean; error?: string }>
}

export const useHelbackupStore = create<HelbackupState>((set) => ({
  status: null,
  jobs: [],
  backups: [],
  loading: false,
  error: null,
  lastUpdate: null,
  triggeringJobId: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const [status, jobs, backupsData] = await Promise.all([
        api.helbackup.status(),
        api.helbackup.jobs(),
        api.helbackup.backups(),
      ])
      set({ status, jobs, backups: backupsData.backups, lastUpdate: new Date(), loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch HELBACKUP data', loading: false })
    }
  },

  triggerJob: async (jobId: string) => {
    set({ triggeringJobId: jobId })
    try {
      await api.helbackup.triggerJob(jobId)
      set({ triggeringJobId: null })
      return { success: true }
    } catch (err) {
      set({ triggeringJobId: null })
      return { success: false, error: err instanceof Error ? err.message : 'Failed to trigger job' }
    }
  },
}))
