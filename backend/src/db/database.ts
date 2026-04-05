import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { nanoid } from 'nanoid'

let db!: Database.Database

export function getDb(): Database.Database {
  return db
}

/** Safely parse a JSON string. Returns fallback if str is falsy or invalid JSON. */
export function safeJson<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback
  try { return JSON.parse(str) as T } catch { return fallback }
}

// Returns the number of new migrations applied (0 if all already up-to-date)
export function initDb(dataDir: string): number {
  const dbDir = path.join(dataDir, 'db')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = path.join(dbDir, 'heldash.db')
  db = new Database(dbPath)

  // Performance settings
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')

  applySchema(db)
  return runMigrations(db, dataDir)
}

function migrateIconFiles(db: Database.Database, dataDir: string) {
  const iconsDir = path.join(dataDir, 'icons')
  if (!fs.existsSync(iconsDir)) return

  const mimeMap: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    svg: 'image/svg+xml', webp: 'image/webp',
  }

  // Migrate service icons
  const services = db.prepare(
    "SELECT id, icon_url FROM services WHERE icon_url IS NOT NULL AND icon_id IS NULL"
  ).all() as { id: string; icon_url: string }[]

  for (const svc of services) {
    try {
      const filename = path.basename(svc.icon_url)
      const filePath = path.join(iconsDir, filename)
      if (!fs.existsSync(filePath)) continue
      const data = fs.readFileSync(filePath)
      const ext = path.extname(filename).slice(1).toLowerCase()
      const mimeType = mimeMap[ext] ?? 'image/png'
      const id = nanoid()
      db.prepare('INSERT INTO icons (id, name, source, data, mime_type) VALUES (?, ?, ?, ?, ?)')
        .run(id, `service_${svc.id}`, 'upload', data, mimeType)
      db.prepare('UPDATE services SET icon_id = ?, icon_url = NULL WHERE id = ?').run(id, svc.id)
    } catch { /* skip files that can't be read */ }
  }

  // Migrate bookmark icons
  const bookmarks = db.prepare(
    "SELECT id, icon_url FROM bookmarks WHERE icon_url IS NOT NULL AND icon_id IS NULL"
  ).all() as { id: string; icon_url: string }[]

  for (const bm of bookmarks) {
    try {
      const filename = path.basename(bm.icon_url)
      const filePath = path.join(iconsDir, filename)
      if (!fs.existsSync(filePath)) continue
      const data = fs.readFileSync(filePath)
      const ext = path.extname(filename).slice(1).toLowerCase()
      const mimeType = mimeMap[ext] ?? 'image/png'
      const id = nanoid()
      db.prepare('INSERT INTO icons (id, name, source, data, mime_type) VALUES (?, ?, ?, ?, ?)')
        .run(id, `bm_${bm.id}`, 'upload', data, mimeType)
      db.prepare('UPDATE bookmarks SET icon_id = ?, icon_url = NULL WHERE id = ?').run(id, bm.id)
    } catch { /* skip */ }
  }

  // Migrate widget icons
  const widgets = db.prepare(
    "SELECT id, icon_url FROM widgets WHERE icon_url IS NOT NULL AND icon_id IS NULL"
  ).all() as { id: string; icon_url: string }[]

  for (const w of widgets) {
    try {
      const filename = path.basename(w.icon_url)
      const filePath = path.join(iconsDir, filename)
      if (!fs.existsSync(filePath)) continue
      const data = fs.readFileSync(filePath)
      const ext = path.extname(filename).slice(1).toLowerCase()
      const mimeType = mimeMap[ext] ?? 'image/png'
      const id = nanoid()
      db.prepare('INSERT INTO icons (id, name, source, data, mime_type) VALUES (?, ?, ?, ?, ?)')
        .run(id, `widget_${w.id}`, 'upload', data, mimeType)
      db.prepare('UPDATE widgets SET icon_id = ?, icon_url = NULL WHERE id = ?').run(id, w.id)
    } catch { /* skip */ }
  }
}

// Returns count of newly applied migrations (columns that didn't exist yet)
function runMigrations(db: Database.Database, dataDir: string): number {
  let applied = 0
  const migrations: string[] = [
    'ALTER TABLE services ADD COLUMN icon_url TEXT',
    'ALTER TABLE users ADD COLUMN email TEXT',
    'ALTER TABLE users ADD COLUMN first_name TEXT',
    'ALTER TABLE users ADD COLUMN last_name TEXT',
    'ALTER TABLE users ADD COLUMN user_group_id TEXT',  // FK not enforceable via ALTER TABLE in SQLite
    'ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1',
    'ALTER TABLE users ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime(\'now\'))',
    // Per-user dashboard: existing items become the shared guest dashboard
    'ALTER TABLE dashboard_items ADD COLUMN owner_id TEXT NOT NULL DEFAULT \'guest\'',
    // Widget icons
    'ALTER TABLE widgets ADD COLUMN icon_url TEXT',
    // Docker page access per user group
    'ALTER TABLE user_groups ADD COLUMN docker_access INTEGER NOT NULL DEFAULT 0',
    // Docker widget visibility per user group
    'ALTER TABLE user_groups ADD COLUMN docker_widget_access INTEGER NOT NULL DEFAULT 0',
    // Background image assigned to each user group
    'ALTER TABLE user_groups ADD COLUMN background_id TEXT',
    // Widget display location: sidebar or topbar (replaces show_in_topbar)
    'ALTER TABLE widgets ADD COLUMN display_location TEXT NOT NULL DEFAULT \'none\'',
    // Dashboard groups: named containers for dashboard items
    'ALTER TABLE dashboard_items ADD COLUMN group_id TEXT',
    // Recyclarr extended config fields
    'ALTER TABLE recyclarr_config ADD COLUMN preferred_ratio REAL NOT NULL DEFAULT 0.0',
    "ALTER TABLE recyclarr_config ADD COLUMN profiles_config TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE recyclarr_config ADD COLUMN sync_schedule TEXT NOT NULL DEFAULT 'manual'",
    'ALTER TABLE recyclarr_config ADD COLUMN last_synced_at TEXT',
    'ALTER TABLE recyclarr_config ADD COLUMN last_sync_success INTEGER',
    'ALTER TABLE recyclarr_config ADD COLUMN delete_old_cfs INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE recyclarr_config ADD COLUMN is_syncing INTEGER NOT NULL DEFAULT 0',
    // HA panel area assignment for grouped view
    'ALTER TABLE ha_panels ADD COLUMN area_id TEXT',
    // Recyclarr v2: frozen instance key for YAML
    'ALTER TABLE recyclarr_config ADD COLUMN yaml_instance_key TEXT',
    // Recyclarr v2: quality definition type override (series|anime for sonarr)
    "ALTER TABLE recyclarr_config ADD COLUMN quality_def_type TEXT NOT NULL DEFAULT 'movie'",
    // Recyclarr v2: last known scores for change detection (JSON)
    "ALTER TABLE recyclarr_config ADD COLUMN last_known_scores TEXT NOT NULL DEFAULT '{}'",
    // Recyclarr v2 per-profile: score_set and min_upgrade_format_score stored in profiles_config JSON
    // Bookmarks: description + dashboard toggle
    'ALTER TABLE bookmarks ADD COLUMN description TEXT',
    'ALTER TABLE bookmarks ADD COLUMN show_on_dashboard INTEGER NOT NULL DEFAULT 0',
    // Unraid instances
    `CREATE TABLE IF NOT EXISTS unraid_instances (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      url         TEXT NOT NULL,
      api_key     TEXT NOT NULL,
      enabled     INTEGER NOT NULL DEFAULT 1,
      position    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    'ALTER TABLE services ADD COLUMN icon_id TEXT REFERENCES icons(id)',
    'ALTER TABLE bookmarks ADD COLUMN icon_id TEXT REFERENCES icons(id)',
    'ALTER TABLE widgets ADD COLUMN icon_id TEXT REFERENCES icons(id)',
    'ALTER TABLE network_devices ADD COLUMN icon_id TEXT REFERENCES icons(id)',
    // Unified instances — seed from old tables (INSERT OR IGNORE = idempotent)
    `INSERT OR IGNORE INTO instances (id, type, name, url, config, enabled, position, created_at, updated_at)
      SELECT id, 'ha', name, url, json_object('token', token), enabled, position, created_at, updated_at FROM ha_instances`,
    `INSERT OR IGNORE INTO instances (id, type, name, url, config, enabled, position, created_at, updated_at)
      SELECT id, type, name, url, json_object('api_key', api_key), enabled, position, created_at, updated_at FROM arr_instances`,
    `INSERT OR IGNORE INTO instances (id, type, name, url, config, enabled, position, created_at, updated_at)
      SELECT id, 'unraid', name, url, json_object('api_key', api_key), enabled, position, created_at, updated_at FROM unraid_instances`,
    'ALTER TABLE instances ADD COLUMN icon_id TEXT REFERENCES icons(id)',
  ]
  for (const sql of migrations) {
    try {
      db.exec(sql)
      applied++
    } catch {
      // Column already exists – ignore
    }
  }

  migrateIconFiles(db, dataDir)

  // Drop legacy TRaSH tables from old implementation (safe if already absent)
  const legacyTables = [
    'trash_guides_cache', 'trash_guides_file_index', 'trash_format_instances',
    'trash_instance_configs', 'trash_custom_formats', 'trash_deprecated_formats',
    'trash_pending_previews', 'trash_sync_checkpoints', 'trash_sync_log',
    'trash_profile_configs', 'trash_user_overrides', 'trash_instance_naming_configs',
    'trash_instance_quality_size_configs', 'trash_cache', 'trash_instance_config',
    'trash_format_overrides',
  ]
  for (const table of legacyTables) {
    try { db.exec(`DROP TABLE IF EXISTS ${table}`) } catch { /* ignore */ }
  }

  // Ensure default system user groups exist
  db.prepare(`
    INSERT OR IGNORE INTO user_groups (id, name, description, is_system)
    VALUES ('grp_admin', 'Admin', 'Full unrestricted access', 1)
  `).run()
  db.prepare(`
    INSERT OR IGNORE INTO user_groups (id, name, description, is_system)
    VALUES ('grp_guest', 'Guest', 'Read-only access', 1)
  `).run()

  // Ensure tmdb_api_key default exists
  db.prepare("INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('tmdb_api_key', '\"\"', datetime('now'))").run()

  // Onboarding wizard state
  db.prepare("INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('onboarding_completed', '\"0\"', datetime('now'))").run()
  db.prepare("INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('onboarding_skipped_at', 'null', datetime('now'))").run()

  // Admin group always has Docker access
  db.exec("UPDATE user_groups SET docker_access = 1 WHERE id = 'grp_admin'")

  // Sync role column from group membership (runs every startup — idempotent)
  db.exec("UPDATE users SET role = 'admin' WHERE user_group_id = 'grp_admin'")
  db.exec("UPDATE users SET role = 'user' WHERE user_group_id IS NULL OR user_group_id != 'grp_admin'")

  return applied
}

function applySchema(db: Database.Database) {
  db.exec(`
    -- App groups / categories
    CREATE TABLE IF NOT EXISTS groups (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      icon        TEXT,
      position    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Service tiles
    CREATE TABLE IF NOT EXISTS services (
      id            TEXT PRIMARY KEY,
      group_id      TEXT REFERENCES groups(id) ON DELETE SET NULL,
      name          TEXT NOT NULL,
      url           TEXT NOT NULL,
      icon          TEXT,
      description   TEXT,
      tags          TEXT DEFAULT '[]',  -- JSON array
      position_x    INTEGER NOT NULL DEFAULT 0,
      position_y    INTEGER NOT NULL DEFAULT 0,
      width         INTEGER NOT NULL DEFAULT 1,
      height        INTEGER NOT NULL DEFAULT 1,
      check_enabled INTEGER NOT NULL DEFAULT 1,
      check_url     TEXT,               -- Override URL for health check
      check_interval INTEGER NOT NULL DEFAULT 60,  -- seconds
      last_status   TEXT,               -- online | offline | unknown
      last_checked  TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Dashboard settings (key-value store)
    CREATE TABLE IF NOT EXISTS settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- User groups for access control (separate from app groups)
    CREATE TABLE IF NOT EXISTS user_groups (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      is_system   INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role          TEXT NOT NULL DEFAULT 'user',
      email         TEXT,
      first_name    TEXT,
      last_name     TEXT,
      user_group_id TEXT REFERENCES user_groups(id) ON DELETE SET NULL,
      is_active     INTEGER NOT NULL DEFAULT 1,
      oidc_subject  TEXT,
      oidc_provider TEXT,
      last_login    TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- App visibility per user group (presence = hidden)
    CREATE TABLE IF NOT EXISTS group_service_visibility (
      group_id    TEXT NOT NULL,
      service_id  TEXT NOT NULL,
      PRIMARY KEY (group_id, service_id)
    );

    -- *arr media instances (Radarr / Sonarr / Prowlarr)
    CREATE TABLE IF NOT EXISTS arr_instances (
      id          TEXT PRIMARY KEY,
      type        TEXT NOT NULL,
      name        TEXT NOT NULL,
      url         TEXT NOT NULL,
      api_key     TEXT NOT NULL,
      enabled     INTEGER NOT NULL DEFAULT 1,
      position    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- *arr instance visibility per user group (presence = hidden)
    CREATE TABLE IF NOT EXISTS group_arr_visibility (
      group_id    TEXT NOT NULL,
      instance_id TEXT NOT NULL,
      PRIMARY KEY (group_id, instance_id)
    );

    -- Dashboard items — unified ordered list (services, arr instances, placeholders, widgets)
    CREATE TABLE IF NOT EXISTS dashboard_items (
      id         TEXT PRIMARY KEY,
      type       TEXT NOT NULL,    -- 'service' | 'arr_instance' | 'placeholder_*' | 'widget'
      ref_id     TEXT,             -- NULL for placeholders
      position   INTEGER NOT NULL DEFAULT 0,
      group_id   TEXT,             -- FK to dashboard_groups.id (nullable for ungrouped)
      owner_id   TEXT NOT NULL DEFAULT 'guest',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Dashboard groups — named containers for dashboard items
    CREATE TABLE IF NOT EXISTS dashboard_groups (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL DEFAULT 'Group',
      owner_id   TEXT NOT NULL DEFAULT 'guest',
      position   INTEGER NOT NULL DEFAULT 0,
      col_span   INTEGER NOT NULL DEFAULT 6,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Widgets
    CREATE TABLE IF NOT EXISTS widgets (
      id             TEXT PRIMARY KEY,
      type           TEXT NOT NULL,               -- 'server_status'
      name           TEXT NOT NULL,
      config         TEXT NOT NULL DEFAULT '{}',  -- JSON per widget type
      position       INTEGER NOT NULL DEFAULT 0,
      show_in_topbar INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Widget visibility per user group (presence = hidden)
    CREATE TABLE IF NOT EXISTS group_widget_visibility (
      group_id  TEXT NOT NULL,
      widget_id TEXT NOT NULL,
      PRIMARY KEY (group_id, widget_id)
    );

    -- Dashboard background images
    CREATE TABLE IF NOT EXISTS backgrounds (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      file_path  TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Home Assistant instances
    CREATE TABLE IF NOT EXISTS ha_instances (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      url         TEXT NOT NULL,
      token       TEXT NOT NULL,
      enabled     INTEGER NOT NULL DEFAULT 1,
      position    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Home Assistant panels (entity cards per user)
    CREATE TABLE IF NOT EXISTS ha_panels (
      id          TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL,
      entity_id   TEXT NOT NULL,
      label       TEXT,
      panel_type  TEXT NOT NULL DEFAULT 'auto',
      position    INTEGER NOT NULL DEFAULT 0,
      owner_id    TEXT NOT NULL DEFAULT 'guest',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Recyclarr config per arr instance
    CREATE TABLE IF NOT EXISTS recyclarr_config (
      id              TEXT PRIMARY KEY,
      instance_id     TEXT NOT NULL UNIQUE,
      enabled         INTEGER NOT NULL DEFAULT 1,
      templates       TEXT NOT NULL DEFAULT '[]',
      score_overrides TEXT NOT NULL DEFAULT '[]',
      user_cf_names   TEXT NOT NULL DEFAULT '[]',
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Recyclarr sync history
    CREATE TABLE IF NOT EXISTS recyclarr_sync_history (
      id             TEXT PRIMARY KEY,
      synced_at      TEXT NOT NULL DEFAULT (datetime('now')),
      success        INTEGER NOT NULL,
      output         TEXT NOT NULL,
      changes_summary TEXT
    );

    -- Service health history for uptime tracking
    CREATE TABLE IF NOT EXISTS service_health_history (
      service_id  TEXT NOT NULL,
      checked_at  TEXT NOT NULL DEFAULT (datetime('now')),
      status      INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_health_service_time ON service_health_history(service_id, checked_at);

    -- Activity log
    CREATE TABLE IF NOT EXISTS activity_log (
      id         TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      category   TEXT NOT NULL,
      message    TEXT NOT NULL,
      severity   TEXT NOT NULL DEFAULT 'info',
      meta       TEXT
    );

    -- HA Alerts
    CREATE TABLE IF NOT EXISTS ha_alerts (
      id TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL REFERENCES ha_instances(id) ON DELETE CASCADE,
      entity_id TEXT NOT NULL,
      condition_type TEXT NOT NULL,
      condition_value TEXT,
      message TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_triggered_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Floorplans for HA
    CREATE TABLE IF NOT EXISTS ha_floorplans (
      id TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL REFERENCES ha_instances(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'indoor',
      level INTEGER NOT NULL DEFAULT 0,
      icon TEXT NOT NULL DEFAULT '🏠',
      orientation TEXT NOT NULL DEFAULT 'landscape',
      image_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ha_floorplan_entities (
      id TEXT PRIMARY KEY,
      floorplan_id TEXT NOT NULL REFERENCES ha_floorplans(id) ON DELETE CASCADE,
      entity_id TEXT NOT NULL,
      pos_x REAL NOT NULL,
      pos_y REAL NOT NULL,
      display_size TEXT NOT NULL DEFAULT 'medium',
      show_label INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Network devices
    CREATE TABLE IF NOT EXISTS network_devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ip TEXT NOT NULL,
      mac TEXT,
      wol_enabled INTEGER NOT NULL DEFAULT 0,
      wol_broadcast TEXT,
      check_port INTEGER,
      subnet TEXT,
      group_name TEXT,
      icon TEXT NOT NULL DEFAULT '🖥️',
      last_status TEXT,
      last_checked TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS network_device_history (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES network_devices(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      checked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS resource_history (
      id TEXT PRIMARY KEY,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolution TEXT NOT NULL,
      cpu_percent REAL,
      ram_percent REAL,
      ram_used_gb REAL,
      net_rx_mbps REAL,
      net_tx_mbps REAL
    );

    CREATE TABLE IF NOT EXISTS backup_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_checked_at TEXT,
      last_status TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Bookmarks
    CREATE TABLE IF NOT EXISTS bookmarks (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      url      TEXT NOT NULL,
      icon_url TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Unified instance registry (mirrors ha_instances, arr_instances, unraid_instances)
    CREATE TABLE IF NOT EXISTS instances (
      id         TEXT PRIMARY KEY,
      type       TEXT NOT NULL,
      name       TEXT NOT NULL,
      url        TEXT NOT NULL,
      config     TEXT NOT NULL DEFAULT '{}',
      enabled    INTEGER NOT NULL DEFAULT 1,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Icons: centralized icon storage (dashboardicons CDN cache + uploads)
    CREATE TABLE IF NOT EXISTS icons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT,
      data BLOB NOT NULL,
      mime_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_icons_source ON icons(source);
    CREATE INDEX IF NOT EXISTS idx_icons_name ON icons(name);
    CREATE INDEX IF NOT EXISTS idx_dashboard_items_owner ON dashboard_items(owner_id);
    CREATE INDEX IF NOT EXISTS idx_ha_panels_owner ON ha_panels(owner_id, instance_id);
    CREATE INDEX IF NOT EXISTS idx_instances_type ON instances(type);
    CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

    -- Insert default settings if not exist
    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('theme_mode', '"dark"'),
      ('theme_accent', '"cyan"'),
      ('dashboard_title', '"HELDASH"'),
      ('auth_enabled', 'true'),
      ('auth_mode', '"local"'),
      ('auto_theme_enabled', 'false'),
      ('auto_theme_light_start', '"08:00"'),
      ('auto_theme_dark_start', '"20:00"'),
      ('design_border_radius', '"default"'),
      ('design_glass_blur', '"medium"'),
      ('design_density', '"comfortable"'),
      ('design_animations', '"full"'),
      ('design_sidebar_style', '"default"'),
      ('design_custom_css', '""');
  `)
}
