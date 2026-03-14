# Architecture & Environment

## Architecture Decisions

**Single container**: Fastify serves `/api/*` + compiled React SPA from `/public`. TLS terminated externally by nginx-proxy-manager.

**SQLite**: WAL mode, no ORM, raw better-sqlite3 prepared statements. Row types as TypeScript interfaces, cast with `as RowType | undefined`. DB in mounted `/data` volume.

**Auth**: `@fastify/jwt` signs with `SECRET_KEY`, stored in `httpOnly sameSite:strict` cookie. `app.authenticate` = verify JWT; `app.requireAdmin` = verify JWT + assert `groupId === 'grp_admin'`. Public: all GETs, `/api/auth/status`, check endpoints.

**Group-based ACL**:
- `grp_admin` — full access, always has Docker + Docker widget access, undeletable
- `grp_guest` — read-only, no Docker access by default
- Custom groups — read-only, per-group visibility; Docker page + Docker widget access toggled independently
- Visibility tables are sparse: row presence = hidden. `docker_overview` bypasses `group_widget_visibility`, uses `user_groups.docker_widget_access` instead.
- Backgrounds: `background_id` FK on `user_groups`; `GET /api/backgrounds/mine` falls back to `grp_guest` when unauthenticated.

**Frontend routing**: No React Router. Single `page` state string in `App.tsx`.

**Zustand stores**:
- `useStore` — services, groups, settings, auth, users, userGroups, backgrounds
- `useArrStore` — arr instances, statuses, stats, queues, calendars, indexers, histories
- `useDockerStore` — containers, stats map, control action
- `useWidgetStore` — widget list, stats cache, AdGuard toggle
- `useDashboardStore` — dashboard items, ordered list, add/remove/reorder
- `useHaStore` — HA instances, panels, stateMap per instance
- `useTrashStore` — configs, profiles, formats, preview, syncLogs, deprecated, importable (all keyed by instanceId)

**Shared frontend utilities** (`utils.ts`): `normalizeUrl(u)` and `containerCounts(containers)` — never redefine inline.

**Dashboard grid**: 20-column CSS grid. Apps = 2 cols, widgets = 4 cols × 2 rows. `grid-auto-flow: dense`.

**DnD persistence**: position columns patched on drag end. Groups → `position`; services within group → `position_x`; arr instances → `position`; dashboard groups → `dashboard_groups.position`; dashboard items → `dashboard_items.position`. Optimistic update in store, async persist.

**Docker Engine API proxy**: `undici.Pool` (10 connections) to `/var/run/docker.sock`. SSE log stream: `reply.hijack()` before Docker request, errors sent as SSE events after hijack.

**Widgets**: `server_status`, `adguard_home`, `docker_overview`, `nginx_pm`, `home_assistant`. Credentials stripped by `sanitize()`. `docker_overview` gated by `docker_widget_access`, not `group_widget_visibility`. `nginx_pm` caches Bearer token 6h.

**Icon/background upload**: base64 JSON (`{ data, content_type }`), no multipart. Backend writes to `DATA_DIR/icons/` or `DATA_DIR/backgrounds/`. `path.basename()` prevents traversal.

**Media proxy**: api_key stored in DB, never returned (`sanitize()` strips it). `rejectUnauthorized: false` for self-signed certs. SABnzbd: single `/api?mode=X&apikey=KEY&output=json` endpoint, `SabnzbdClient` does NOT extend `ArrBaseClient`.

**ServicesPage**: `table-layout: fixed` + `<colgroup>` percentage widths for aligned columns. Long URLs clipped with `text-overflow: ellipsis`.

**HA WebSocket bridge**: `HaWsClient` (undici `WebSocket`) authenticates, subscribes to `state_changed`. `HaWsManager` holds one client per instanceId. SSE endpoint fans events to `EventSource` clients. Reconnect: exponential backoff 5s→60s. `auth_invalid` → stop retrying. Invalidated on instance PATCH/DELETE.

**TRaSH Guides sync**:
- GitHub fetch: incremental — commit SHA → git tree diff → per-file SHA → fetch only changed. Files sorted alphabetically (deterministic slug).
- Parser: two-pass — CFs first (build `trash_id→slug` map) → profiles. `PARSER_SCHEMA_VERSION` triggers re-normalization.
- Slug: `kebab_case(name)`, `+→-plus`, `&→-and`, `__dup1`/`__dup2` for collisions.
- Conditions hash: `SHA-256(sorted JSON)` first 16 hex chars. O(1) drift detection.
- Format ID resolver: `trash_format_instances` table + in-memory `Map<instanceId, Map<slug, id>>`. Invalidated after sync.
- Merge engine: pure function, no external calls. `ArrSnapshot` + upstream + overrides + deprecated → `Changeset`.
- Rate limiter: token bucket 5 req/s per instance, singleton pool.
- Sync phases: A=Create, B=UpdateConditions, C=ProfileScorePatch, D=SoftDeprecate, E=Repair. Each in try/catch.
- Notify mode: stores preview in `trash_pending_previews` (24h TTL). Apply route calls `runSync` with trigger `'user_confirm'`.
- Scheduler: startup comparison of `now - last_sync_at` vs interval, 2s stagger between instances.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| PORT | 8282 | Fastify listen port |
| DATA_DIR | /data | Root for DB and icon files |
| NODE_ENV | production | |
| LOG_LEVEL | info | Pino log level |
| LOG_FORMAT | pretty | `pretty` = pino-pretty colorized; `json` = raw structured JSON |
| SECRET_KEY | — | **Required.** JWT signing secret (`openssl rand -hex 32`) |
| SECURE_COOKIES | false | `true` = HTTPS only (behind TLS proxy) |
