// ── State-based scheduler ─────────────────────────────────────────────────────
// Per-instance timers. No drift on restart: compares now vs last_sync_at.
// Daily repair job runs independently of sync schedule.
// Multi-profile: timers are keyed by instanceId; runSync iterates all profiles internally.

import { getDb } from '../db/database'
import { getInterruptedCheckpoints, isDailyRepairDue } from './repair-engine'
import { runParserMigrations } from './migration-runner'
import type { TrashInstanceConfig, TrashProfileConfig } from './types'
import type { FastifyBaseLogger } from 'fastify'

// ── Per-instance sync callback ────────────────────────────────────────────────
type SyncFn = (instanceId: string, trigger: 'auto' | 'repair_daily') => Promise<void>

let syncFn: SyncFn | null = null
let logger: FastifyBaseLogger | null = null

export function registerSyncFn(fn: SyncFn, log: FastifyBaseLogger) {
  syncFn = fn
  logger = log
}

// ── In-progress sync guard ────────────────────────────────────────────────────
const activeSyncs = new Set<string>()

export function isActivelySyncing(instanceId: string): boolean {
  return activeSyncs.has(instanceId)
}

export function acquireSync(instanceId: string): boolean {
  if (activeSyncs.has(instanceId)) return false
  activeSyncs.add(instanceId)
  return true
}

export function releaseSync(instanceId: string) {
  activeSyncs.delete(instanceId)
}

// ── Timer registry ────────────────────────────────────────────────────────────
const timers = new Map<string, NodeJS.Timeout>()

function cancelTimer(instanceId: string) {
  const t = timers.get(instanceId)
  if (t) { clearTimeout(t); timers.delete(instanceId) }
}

function scheduleNext(instanceId: string, delayMs: number) {
  cancelTimer(instanceId)
  const t = setTimeout(() => {
    timers.delete(instanceId)
    triggerSync(instanceId, 'auto').catch(() => {})
  }, Math.max(0, delayMs))
  timers.set(instanceId, t)
}

async function triggerSync(instanceId: string, trigger: 'auto' | 'repair_daily') {
  if (!syncFn) return
  if (!acquireSync(instanceId)) {
    logger?.debug({ instanceId }, 'trash: sync already in progress, skipping auto trigger')
    return
  }
  try {
    await syncFn(instanceId, trigger)
  } catch (err: unknown) {
    logger?.warn({ instanceId, err }, 'trash: scheduled sync failed')
  } finally {
    releaseSync(instanceId)
    // Re-schedule next run after completion
    const db = getDb()
    const cfg = db.prepare(
      'SELECT * FROM trash_instance_configs WHERE instance_id = ?'
    ).get(instanceId) as TrashInstanceConfig | undefined
    if (cfg?.enabled) {
      const nextMs = getMinIntervalMs(instanceId)
      if (nextMs !== null) scheduleNext(instanceId, nextMs)
    }
  }
}

// ── Compute minimum sync interval across all enabled profile configs ──────────
function getMinIntervalMs(instanceId: string): number | null {
  const db = getDb()
  const profiles = db.prepare(
    'SELECT sync_interval_hours FROM trash_profile_configs WHERE instance_id = ? AND enabled = 1'
  ).all(instanceId) as Array<{ sync_interval_hours: number }>
  if (profiles.length === 0) {
    // Fallback to instance config if no profiles yet
    const cfg = db.prepare(
      'SELECT sync_interval_hours FROM trash_instance_configs WHERE instance_id = ?'
    ).get(instanceId) as { sync_interval_hours: number } | undefined
    return cfg ? cfg.sync_interval_hours * 3_600_000 : null
  }
  const min = Math.min(...profiles.map(p => p.sync_interval_hours))
  return min * 3_600_000
}

// ── Initialize scheduler on startup ──────────────────────────────────────────
export function initScheduler(log: FastifyBaseLogger) {
  logger = log
  const db = getDb()

  // 1. Run parser migrations
  const migrated = runParserMigrations()
  if (migrated > 0) log.info({ migrated }, 'trash: schema migration applied')

  // 2. Recover interrupted checkpoints
  const interrupted = getInterruptedCheckpoints()
  for (const chk of interrupted) {
    log.warn({
      instanceId: chk.instanceId,
      completedSteps: chk.completedSteps,
      totalSteps: chk.totalSteps,
      startedAt: chk.startedAt,
    }, 'trash: found interrupted sync checkpoint — repair will run on next sync')
  }

  // 3. Schedule per-instance syncs based on profile configs
  // Get all distinct enabled instances that have at least one enabled profile
  const instanceIds = (db.prepare(`
    SELECT DISTINCT p.instance_id
    FROM trash_profile_configs p
    JOIN trash_instance_configs c ON c.instance_id = p.instance_id
    WHERE p.enabled = 1 AND c.enabled = 1
  `).all() as Array<{ instance_id: string }>).map(r => r.instance_id)

  // Also include instances with no profile_configs but with a configured profile_slug
  // (backward compat — they will get synced even if profile_configs is empty)
  const legacyInstances = (db.prepare(`
    SELECT instance_id FROM trash_instance_configs
    WHERE enabled = 1 AND profile_slug IS NOT NULL
    AND instance_id NOT IN (SELECT instance_id FROM trash_profile_configs)
  `).all() as Array<{ instance_id: string }>).map(r => r.instance_id)

  const allInstanceIds = [...new Set([...instanceIds, ...legacyInstances])]

  let staggerMs = 0

  for (const instanceId of allInstanceIds) {
    // Use the earliest last_sync_at across all profiles to decide if a catch-up is needed
    const earliest = db.prepare(`
      SELECT MIN(last_sync_at) as min_sync FROM trash_profile_configs
      WHERE instance_id = ? AND enabled = 1
    `).get(instanceId) as { min_sync: string | null } | undefined

    const intervalMs = getMinIntervalMs(instanceId) ?? 24 * 3_600_000
    const lastSyncMs = earliest?.min_sync ? new Date(earliest.min_sync).getTime() : 0
    const elapsed = Date.now() - lastSyncMs

    if (elapsed >= intervalMs || !earliest?.min_sync) {
      setTimeout(() => triggerSync(instanceId, 'auto').catch(() => {}), staggerMs)
      staggerMs += 2_000
    } else {
      const remaining = intervalMs - elapsed
      scheduleNext(instanceId, remaining)
      log.debug({ instanceId, nextSyncInMs: remaining }, 'trash: scheduled next sync')
    }

    // Schedule daily repair if due
    if (isDailyRepairDue(instanceId)) {
      setTimeout(() => triggerSync(instanceId, 'repair_daily').catch(() => {}), staggerMs + 5_000)
    }
  }
}

// ── Reschedule a single instance (call on config change) ─────────────────────
export function rescheduleInstance(instanceId: string) {
  const db = getDb()
  cancelTimer(instanceId)

  const cfg = db.prepare(
    'SELECT * FROM trash_instance_configs WHERE instance_id = ?'
  ).get(instanceId) as TrashInstanceConfig | undefined
  if (!cfg?.enabled) return

  const hasAutoProfile = (db.prepare(
    "SELECT 1 FROM trash_profile_configs WHERE instance_id = ? AND enabled = 1 AND sync_mode = 'auto'"
  ).get(instanceId)) !== undefined

  if (!hasAutoProfile) return

  const intervalMs = getMinIntervalMs(instanceId)
  if (!intervalMs) return

  const earliest = db.prepare(`
    SELECT MIN(last_sync_at) as min_sync FROM trash_profile_configs
    WHERE instance_id = ? AND enabled = 1
  `).get(instanceId) as { min_sync: string | null } | undefined

  const lastSyncMs = earliest?.min_sync ? new Date(earliest.min_sync).getTime() : 0
  const elapsed = Date.now() - lastSyncMs

  if (elapsed >= intervalMs) {
    triggerSync(instanceId, 'auto').catch(() => {})
  } else {
    scheduleNext(instanceId, intervalMs - elapsed)
  }
}

// ── Clear all timers on shutdown ──────────────────────────────────────────────
export function shutdownScheduler() {
  for (const [id, t] of timers) { clearTimeout(t); timers.delete(id) }
  activeSyncs.clear()
}
