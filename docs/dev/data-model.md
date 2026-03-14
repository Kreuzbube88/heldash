# Data Model

All routes prefixed `/api`. SQLite via better-sqlite3 (WAL mode). DB at `DATA_DIR/db/heldash.db`.

## services
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | nanoid() |
| group_id | TEXT | FK → groups.id ON DELETE SET NULL |
| name | TEXT NOT NULL | |
| url | TEXT NOT NULL | Primary service URL |
| icon | TEXT | Emoji character |
| icon_url | TEXT | `/icons/<id>.<ext>` |
| description | TEXT | |
| tags | TEXT | JSON array string |
| position_x | INTEGER | Sort order within group |
| check_enabled | INTEGER | 0/1 |
| check_url | TEXT | Override URL for health check |
| check_interval | INTEGER | Seconds (default 60) |
| last_status | TEXT | 'online' \| 'offline' \| null |
| last_checked | TEXT | ISO datetime |
| created_at / updated_at | TEXT | |

## groups
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | nanoid() |
| name | TEXT NOT NULL | |
| icon | TEXT | Emoji |
| position | INTEGER | Sort order |
| created_at / updated_at | TEXT | |

## users
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | nanoid() |
| username | TEXT UNIQUE NOT NULL | |
| password_hash | TEXT | bcrypt cost 12 |
| first_name / last_name / email | TEXT | |
| user_group_id | TEXT | FK → user_groups.id |
| is_active | INTEGER | 0/1 |
| last_login | TEXT | ISO datetime |
| oidc_subject / oidc_provider | TEXT | Reserved for OIDC |
| created_at / updated_at | TEXT | |

## user_groups
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | `grp_admin` / `grp_guest` / nanoid() |
| name | TEXT NOT NULL | |
| description | TEXT | |
| is_system | INTEGER | 0/1 — system groups cannot be deleted |
| docker_access | INTEGER | 0/1 — Docker page visible in sidebar |
| docker_widget_access | INTEGER | 0/1 — Docker Overview widgets visible |
| background_id | TEXT | FK → backgrounds.id (nullable) — dashboard background for this group |
| created_at | TEXT | |

## backgrounds
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | nanoid() |
| name | TEXT NOT NULL | Display name |
| file_path | TEXT NOT NULL | `/backgrounds/<id>.<ext>` |
| created_at | TEXT | |

## group_service_visibility / group_arr_visibility / group_widget_visibility
Sparse junction tables: presence of a row means the item is **hidden** for that group. `docker_overview` widgets bypass `group_widget_visibility` and use `user_groups.docker_widget_access` instead.

## arr_instances
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | nanoid() |
| type | TEXT | 'radarr' \| 'sonarr' \| 'prowlarr' \| 'sabnzbd' |
| name / url | TEXT NOT NULL | |
| api_key | TEXT NOT NULL | Never returned to frontend |
| enabled | INTEGER | 0/1 |
| position | INTEGER | Sort order |
| created_at / updated_at | TEXT | |

## widgets
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | nanoid() |
| type | TEXT | 'server_status' \| 'adguard_home' \| 'docker_overview' \| 'nginx_pm' |
| name | TEXT NOT NULL | |
| config | TEXT | JSON — AdGuard/Nginx PM password stripped before sending to frontend |
| position | INTEGER | |
| show_in_topbar | INTEGER | 0/1 |
| display_location | TEXT | 'topbar' \| 'sidebar' \| 'none' |
| icon_url | TEXT | Custom icon (docker_overview falls back to Container lucide icon) |
| created_at / updated_at | TEXT | |

## dashboard_items
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | nanoid() |
| type | TEXT | 'service' \| 'arr_instance' \| 'widget' \| 'placeholder*' |
| ref_id | TEXT | NULL for placeholders |
| position | INTEGER | Sort order within owner/group |
| group_id | TEXT | FK → dashboard_groups.id (nullable) — NULL = ungrouped |
| owner_id | TEXT | user sub or 'guest' |
| created_at | TEXT | |

## dashboard_groups
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | nanoid() |
| name | TEXT NOT NULL | Group display name |
| owner_id | TEXT NOT NULL | user sub or 'guest' |
| position | INTEGER NOT NULL | Sort order among groups |
| col_span | INTEGER NOT NULL | Width on 20-column grid (1-20, default 10). Each app = 2 cols, widget = 4 cols |
| created_at | TEXT NOT NULL | |

## ha_instances
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | nanoid() |
| name | TEXT NOT NULL | Display name |
| url | TEXT NOT NULL | HA base URL (trailing slash stripped) |
| token | TEXT NOT NULL | Long-Lived Access Token — **never returned to frontend** |
| enabled | INTEGER | 0/1 |
| position | INTEGER | Sort order |
| created_at / updated_at | TEXT | |

## ha_panels
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | nanoid() |
| instance_id | TEXT NOT NULL | FK → ha_instances.id (cascaded on delete) |
| entity_id | TEXT NOT NULL | HA entity_id (e.g. `light.living_room`) |
| label | TEXT | Custom display label (null → falls back to friendly_name → entity_id) |
| panel_type | TEXT | `'auto'` (default) or explicit type hint |
| position | INTEGER | Sort order within owner's panel grid |
| owner_id | TEXT | user sub — panels are per-user |
| created_at | TEXT | |

## settings
Key-value table. Values stored as JSON strings. Keys: `theme_mode`, `theme_accent`, `dashboard_title`, `auth_enabled`, `auth_mode`.

## TRaSH Guides tables
| Table | Purpose |
|---|---|
| `trash_guides_cache` | Normalized CF + profile data from GitHub; keyed by `(arr_type, category, slug)` |
| `trash_guides_file_index` | Per-file SHA for incremental fetching |
| `trash_format_instances` | `slug ↔ arr_format_id` mapping per instance; stores `last_conditions_hash` |
| `trash_instance_configs` | Per-instance sync config (profile_slug, sync_mode, interval, enabled) |
| `trash_user_overrides` | Per-instance per-slug score + enabled overrides |
| `trash_custom_formats` | User-imported or non-TRaSH formats tracked by HELDASH |
| `trash_deprecated_formats` | Formats removed from TRaSH; score=0, kept in arr until user deletes |
| `trash_pending_previews` | Stored changesets for notify-mode review; expires 24h |
| `trash_sync_checkpoints` | Crash-safe in-progress sync state (UNIQUE on instance_id) |
| `trash_sync_log` | Audit log: one row per sync run with status, counts, duration |
