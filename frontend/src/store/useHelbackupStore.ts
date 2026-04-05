import { create } from 'zustand'
import { api } from '../api'
import type { HelbackupWidgetStatus, HelbackupJob, HelbackupBackup } from '../types'

interface HelbackupState {
  status: HelbackupWidgetStatus | null
  jobs: HelbackupJob[]
  backups: HelbackupBackup[]
  backupsError: string | null
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
  backupsError: null,
  loading: false,
  error: null,
  lastUpdate: null,
  triggeringJobId: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      // Fetch status and jobs together — these must succeed to show the tab
      const [status, jobs] = await Promise.all([
        api.helbackup.status(),
        api.helbackup.jobs(),
      ])

      // Backups are optional — a known HELBACKUP SQLite bug can affect this endpoint
      let backups: HelbackupBackup[] = []
      let backupsError: string | null = null
      try {
        const backupsData = await api.helbackup.backups()
        backups = backupsData.backups
      } catch (err) {
        backupsError = err instanceof Error ? err.message : 'Failed to load backup history'
      }

      set({ status, jobs, backups, backupsError, lastUpdate: new Date(), loading: false })
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
