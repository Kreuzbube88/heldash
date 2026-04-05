import { create } from 'zustand'
import { api } from '../api'
import type { HelbackupWidgetStatus, HelbackupJob, HelbackupBackup, HelbackupHistoryEntry } from '../types'

interface HelbackupState {
  status: HelbackupWidgetStatus | null
  jobs: HelbackupJob[]
  backups: HelbackupBackup[]
  history: HelbackupHistoryEntry[]
  backupsError: string | null
  historyError: string | null
  loading: boolean
  error: string | null
  lastUpdate: Date | null
  triggeringJobId: string | null
  activeRunId: string | null
  fetchAll: () => Promise<void>
  triggerJob: (jobId: string) => Promise<{ success: boolean; error?: string }>
}

export const useHelbackupStore = create<HelbackupState>((set, get) => ({
  status: null,
  jobs: [],
  backups: [],
  history: [],
  backupsError: null,
  historyError: null,
  loading: false,
  error: null,
  lastUpdate: null,
  triggeringJobId: null,
  activeRunId: null,

  fetchAll: async () => {
    set({ loading: true, error: null })
    try {
      const health = await api.helbackup.health()
      if (!health.ok) throw new Error('HELBACKUP is degraded')

      const [status, jobs] = await Promise.all([
        api.helbackup.status(),
        api.helbackup.jobs(),
      ])

      let backups: HelbackupBackup[] = []
      let backupsError: string | null = null
      let history: HelbackupHistoryEntry[] = []
      let historyError: string | null = null

      await Promise.all([
        api.helbackup.backups().then(d => { backups = d.backups }).catch((err: unknown) => {
          backupsError = err instanceof Error ? err.message : 'Failed to load backups'
        }),
        api.helbackup.history({ limit: 20 }).then(d => { history = d.history }).catch((err: unknown) => {
          historyError = err instanceof Error ? err.message : 'Failed to load history'
        }),
      ])

      set({ status, jobs, backups, backupsError, history, historyError, lastUpdate: new Date(), loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch HELBACKUP data', loading: false })
    }
  },

  triggerJob: async (jobId: string) => {
    set({ triggeringJobId: jobId, activeRunId: null })
    try {
      const data = await api.helbackup.triggerJob(jobId)
      set({ activeRunId: data.runId })

      const poll = async () => {
        try {
          const d = await api.helbackup.history({ jobId, limit: 1 })
          const run = d.history[0]
          if (run && run.status !== 'running') {
            set({ triggeringJobId: null, activeRunId: null })
            await get().fetchAll()
            return
          }
        } catch { /* ignore poll errors, keep trying */ }
        setTimeout(poll, 5_000)
      }
      setTimeout(poll, 2_000)

      return { success: true }
    } catch (err) {
      set({ triggeringJobId: null, activeRunId: null })
      return { success: false, error: err instanceof Error ? err.message : 'Failed to trigger job' }
    }
  },
}))
