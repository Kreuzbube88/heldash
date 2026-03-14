# API Reference

All routes prefixed `/api`. Frontend uses relative paths.

## Services
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/services | public | List (filtered by group visibility) |
| POST | /api/services | authenticate | Create |
| PATCH | /api/services/:id | authenticate | Update fields |
| DELETE | /api/services/:id | authenticate | Delete + icon file |
| POST | /api/services/:id/check | public | Manual health check |
| POST | /api/services/check-all | public | Check all enabled |
| POST | /api/services/:id/icon | authenticate | Upload icon (base64 JSON) |
| GET | /api/services/export | requireAdmin | Export all services as JSON |
| POST | /api/services/import | requireAdmin | Import services from JSON |

## Groups / Settings / Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| GET/POST/PATCH/DELETE | /api/groups | authenticate | CRUD for service groups |
| GET | /api/settings | public | All settings |
| PATCH | /api/settings | requireAdmin | Upsert settings |
| GET | /api/auth/status | public | `{ needsSetup, user }` |
| POST | /api/auth/setup | public | Create first admin |
| POST | /api/auth/login | public | Authenticate, set cookie |
| POST | /api/auth/logout | public | Clear cookie |
| GET | /api/auth/me | authenticate | Current user |

## Users & User Groups
| Method | Path | Auth | Description |
|---|---|---|---|
| GET/POST/PATCH/DELETE | /api/users | requireAdmin | User CRUD |
| GET/POST/DELETE | /api/user-groups | requireAdmin | User group CRUD |
| PUT | /api/user-groups/:id/visibility | requireAdmin | Set hidden service IDs |
| PUT | /api/user-groups/:id/arr-visibility | requireAdmin | Set hidden arr instance IDs |
| PUT | /api/user-groups/:id/widget-visibility | requireAdmin | Set hidden widget IDs (non-docker only) |
| PUT | /api/user-groups/:id/docker-access | requireAdmin | Toggle Docker page access |
| PUT | /api/user-groups/:id/docker-widget-access | requireAdmin | Toggle Docker widget access |
| PUT | /api/user-groups/:id/background | requireAdmin | Assign background (background_id or null) |

## Widgets
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/widgets | public (filtered) | List widgets visible to caller |
| POST | /api/widgets | requireAdmin | Create widget |
| PATCH | /api/widgets/:id | requireAdmin | Update widget |
| DELETE | /api/widgets/:id | requireAdmin | Delete + icon file |
| GET | /api/widgets/:id/stats | public | Live stats (server_status / adguard_home / nginx_pm with proxy+cert counts; `{}` for docker_overview) |
| POST | /api/widgets/:id/icon | requireAdmin | Upload custom icon |
| POST | /api/widgets/:id/adguard/protection | requireAdmin | Toggle AdGuard protection |

## Dashboard
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/dashboard | public | Ordered groups + items with embedded data, filtered by owner + group visibility |
| POST | /api/dashboard/groups | authenticate | Create group |
| PATCH | /api/dashboard/groups/reorder | authenticate | Reorder groups |
| PATCH | /api/dashboard/groups/:id | authenticate | Update group (name, col_span) |
| DELETE | /api/dashboard/groups/:id | authenticate | Delete group (items become ungrouped) |
| PATCH | /api/dashboard/items/:id/group | authenticate | Move item to group (or NULL to ungroup) |
| PATCH | /api/dashboard/groups/:id/reorder-items | authenticate | Reorder items within group |
| POST | /api/dashboard/items | authenticate | Add item |
| DELETE | /api/dashboard/items/:id | authenticate | Remove item |
| DELETE | /api/dashboard/items/by-ref | authenticate | Remove by type + ref_id |
| PATCH | /api/dashboard/reorder | authenticate | Reorder ungrouped items |

## Docker
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/docker/containers | docker_access | List all containers |
| GET | /api/docker/containers/:id/stats | docker_access | One-shot CPU + RAM stats |
| GET | /api/docker/stats | docker_access | Batch stats for all running containers |
| GET | /api/docker/containers/:id/logs | docker_access | SSE log stream (stdout + stderr) |
| POST | /api/docker/containers/:id/start | requireAdmin | Start container |
| POST | /api/docker/containers/:id/stop | requireAdmin | Stop container |
| POST | /api/docker/containers/:id/restart | requireAdmin | Restart container |

## Backgrounds
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/backgrounds | requireAdmin | List all background images |
| GET | /api/backgrounds/mine | public | Background assigned to caller's group (null if none) |
| POST | /api/backgrounds | requireAdmin | Upload background (base64 JSON, max 5 MB, png/jpg/svg/webp) |
| DELETE | /api/backgrounds/:id | requireAdmin | Delete background + file, clears all group assignments |

## Home Assistant
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/ha/instances | optional | List instances (token stripped; non-admin sees enabled only; unauth gets `[]`) |
| POST | /api/ha/instances | requireAdmin | Create instance |
| PATCH | /api/ha/instances/:id | requireAdmin | Update (empty token = keep existing) |
| DELETE | /api/ha/instances/:id | requireAdmin | Delete + cascade all panels |
| POST | /api/ha/instances/:id/test | requireAdmin | Test HA connection (`{ ok, error? }`) |
| GET | /api/ha/instances/:id/states | authenticate | Proxy `GET /api/states` from HA (all entities) |
| GET | /api/ha/instances/:id/stream | authenticate | SSE stream of `state_changed` events from HA WebSocket bridge |
| POST | /api/ha/instances/:id/call | authenticate | Proxy `POST /api/services/:domain/:service` to HA |
| GET | /api/ha/panels | optional | List caller's panels (owner_id = sub or 'guest') |
| POST | /api/ha/panels | authenticate | Add panel (409 if duplicate) |
| PATCH | /api/ha/panels/reorder | authenticate | Reorder panels (registered before `:id` route) |
| PATCH | /api/ha/panels/:id | authenticate | Update panel label / panel_type |
| DELETE | /api/ha/panels/:id | authenticate | Remove panel |

## TRaSH Guides
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/trash/instances | authenticate | List configured instances with `isSyncing` flag |
| POST | /api/trash/instances/:id/configure | requireAdmin | Upsert sync config (profile_slug, sync_mode, interval, enabled) |
| GET | /api/trash/instances/:id/profiles | authenticate | Available TRaSH quality profiles from cache |
| GET | /api/trash/instances/:id/custom-formats | authenticate | All formats with user overrides merged in |
| GET | /api/trash/instances/:id/overrides | authenticate | Raw user overrides |
| PUT | /api/trash/instances/:id/overrides | authenticate | Bulk upsert overrides |
| POST | /api/trash/instances/:id/sync | requireAdmin | Trigger manual sync (async, returns immediately) |
| GET | /api/trash/instances/:id/preview | authenticate | Pending changeset preview (404 if none) |
| POST | /api/trash/instances/:id/apply/:pid | requireAdmin | Apply a pending preview |
| GET | /api/trash/instances/:id/log | authenticate | Sync audit log (default 50 entries) |
| GET | /api/trash/instances/:id/deprecated | authenticate | Deprecated formats list |
| DELETE | /api/trash/instances/:id/deprecated/:slug | requireAdmin | Delete deprecated format (also removes from arr) |
| GET | /api/trash/instances/:id/import-formats | requireAdmin | Live custom formats from arr (for import selection) |
| POST | /api/trash/instances/:id/import-formats | requireAdmin | Import selected format IDs into tracking |
| GET | /api/trash/sync-status | authenticate (silent) | Widget stats — `TrashWidgetStats` |
| POST | /api/trash/github/fetch | requireAdmin | Force re-fetch all TRaSH data from GitHub |

## Misc
| Method | Path | Description |
|---|---|---|
| GET | /api/health | `{ status, version, uptime }` |
| GET | /api/time | `{ iso }` — server time |
| GET | /icons/:filename | Serve uploaded icons |
| GET | /backgrounds/:filename | Serve uploaded background images |
