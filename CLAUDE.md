# CLAUDE.md — HELDASH

Personal homelab dashboard: service tiles, DnD layout, Media (Radarr/Sonarr/Prowlarr/SABnzbd), Docker management, Widgets, Home Assistant, TRaSH Guides sync. Self-hosted on Unraid behind nginx-proxy-manager.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript (strict), Vite 5 |
| State | Zustand (useStore + useArrStore + useDockerStore + useWidgetStore + useDashboardStore + useHaStore + useTrashStore) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities |
| Icons | lucide-react |
| Styling | Vanilla CSS (CSS custom properties, glass morphism) |
| Backend | Fastify 4, TypeScript (strict) |
| Auth | @fastify/jwt + @fastify/cookie + bcryptjs (cost 12) |
| Database | better-sqlite3 (SQLite, WAL mode) |
| HTTP checks | undici Pool (service ping, arr proxy, Docker socket) |
| Container | Docker, single-stage final image (node:20-alpine) |
| Registry | ghcr.io/kreuzbube88/heldash |
| CI | GitHub Actions (workflow_dispatch only) |

## Docs → docs/dev/structure.md | docs/dev/data-model.md | docs/dev/api-reference.md | docs/dev/architecture.md

## Architecture

- Single container: Fastify serves `/api/*` + React SPA. No nginx inside container.
- SQLite: WAL, no ORM, row types as interfaces, booleans as 0/1, `let db!: Database.Database`.
- Auth: JWT httpOnly cookie. `app.authenticate` = verify JWT; `app.requireAdmin` = verify + `groupId === 'grp_admin'`. Public: all GETs, `/api/auth/status`, check endpoints.
- ACL: `grp_admin` full+undeletable; `grp_guest` read-only no Docker; custom groups sparse visibility (row = hidden). `docker_overview` gated by `docker_widget_access`, not visibility table.
- Stores: `useStore`=main; `useArrStore`=media; `useDockerStore`=Docker; `useWidgetStore`=widgets; `useDashboardStore`=dashboard; `useHaStore`=HA; `useTrashStore`=TRaSH.
- Frontend routing: no React Router, single `page` string in `App.tsx`.
- Dashboard: 20-column CSS grid; apps=2 cols, widgets=4×2 cols; `grid-auto-flow:dense`.
- DnD: position/position_x columns patched on drag end; optimistic update then async persist.
- Docker proxy: `undici.Pool` (10 conn) to `/var/run/docker.sock`; SSE: `reply.hijack()` before Docker request.
- Widgets: credentials stripped by `sanitize()`; `docker_overview` bypasses `group_widget_visibility`.
- Icon/background upload: base64 JSON, `path.basename()` prevents traversal.
- Media proxy: `api_key` stripped by `sanitize()`; `rejectUnauthorized:false` for self-signed certs.
- SABnzbd: `/api?mode=X&apikey=KEY&output=json`; `SabnzbdClient` does NOT extend `ArrBaseClient`.
- HA WS bridge: `HaWsClient` per instanceId in `HaWsManager`; SSE fans events; backoff 5s→60s; invalidated on PATCH/DELETE.
- TRaSH: incremental GitHub fetch → two-pass parser → merge engine (pure fn) → rate-limited executor (5 req/s) → phases A–E each try/catch; notify mode stores preview 24h.
- `sanitize()` strips `api_key`, `password_hash`, `token`, widget passwords — never expose in API responses.

## Coding Rules

### General
- TypeScript strict everywhere — no `as any`, no `Body: any`. Proper interfaces for every request body and DB row.
- Keep components small. No god components. No new dependencies without clear reason.
- CSS in `global.css` only — no inline styles except dynamic values.
- Icons: `lucide-react`. Sizes: 16px topbar/sidebar, 14px group headers, 12px card buttons.

### Frontend
- All API calls via `api.ts` — never call `fetch` directly in components.
- All state mutations via Zustand store — never call `api.*` directly in components.
- Shared pure functions in `utils.ts` — never redefine `normalizeUrl` or `containerCounts` inline.
- `useEffect` deps: stable primitives only — never `.filter()/.map()` directly in dep array.
- Parallelize independent API calls with `Promise.all()`.
- Status "unknown" = neutral gray dot only — no text, no tooltip.
- Errors in local `error` state → displayed inline in form/modal.

### Backend
- Interface for every request body (`CreateXBody`, `PatchXBody`) and DB row (`ServiceRow`, `WidgetRow`).
- Return `RowType | undefined` from `.get()` — never `unknown` or `any`.
- `reply.status(N).send({ error: '...' })` for all errors (before hijack).
- HTTP codes: 400 bad input, 404 not found, 413 too large, 415 unsupported type.

## CSS System

All colors via CSS variables. Theme switch: `data-theme` + `data-accent` on `<html>`. `color-scheme: dark/light` per theme block.

**Spacing (8px base)**:
```
--spacing-xs: 4px    --spacing-md: 12px    --spacing-2xl: 24px
--spacing-sm: 8px    --spacing-lg: 16px    --spacing-3xl: 32px
                     --spacing-xl: 20px
```

**Typography**: `--font-sans: 'Geist'` | `--font-display: 'Space Mono'` (h1–h4) | `--font-mono: 'JetBrains Mono'`

**Transitions**:
```
--transition-fast: 100ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-smooth: 350ms cubic-bezier(0.34, 1.56, 0.64, 1)  ← bounce
--transition-slow: 500ms ease
```

**Glass**: `.glass` + `backdrop-filter: blur(24px) saturate(200%)`

**Radius**: `--radius-sm` 8px → `--radius-md` 12px → `--radius-lg` 16px → `--radius-xl` 24px → `--radius-2xl` 32px

**Components**: cards lift 4px + icon 1.08x on hover; status dots pulse (online) / breathe (offline); `@media (prefers-reduced-motion)` disables all animations. TrashPage uses hardcoded hex (`#10b981`, `#f59e0b`, `#f87171`) — no `--success/warning/error` vars.

## Gotchas

- **better-sqlite3**: rejects JS booleans — always `value ? 1 : 0`.
- **Docker Pool**: `new Pool('http://localhost', { socketPath: '/var/run/docker.sock', connections: 10 })` — do NOT use `undici.Client` (serialized requests).
- **SSE hijack**: `reply.hijack()` before Docker request; errors must be sent as SSE events after.
- **Docker log mux**: non-TTY frames have 8-byte header `[type(1)][reserved(3)][size(4)]`; first byte `0x01/0x02` = muxed.
- **Self-signed TLS**: all undici agents use `connect: { rejectUnauthorized: false }`.
- **DB migration**: `ALTER TABLE … ADD COLUMN` in try/catch in `runMigrations()` — silently ignores "column exists". Returns count of applied migrations.
- **Icon paths**: `path.basename()` in `/icons/:filename` route prevents path traversal.
- **Node.js not on dev machine**: TypeScript errors caught by CI only, cannot run npm/tsc locally.
- **JWT secret**: `SECRET_KEY` env required; insecure default in dev logged as warning.
- **Sonarr calendar**: requires `includeSeries=true`; use `series?.title` (null safety).
- **Healthcheck**: use `127.0.0.1` not `localhost` (avoids IPv6 resolution issues).
- **Service visibility SQL**: LEFT JOIN + `WHERE g.service_id IS NULL` — never load all rows and filter in JS.
- **docker_overview access**: controlled by `docker_widget_access` column, enforced in both dashboard and widget list routes.
- **Topbar widget visibility**: `loadWidgets()` depends on `[isAuthenticated, authUser?.id]` — stale list otherwise persists across auth changes.
- **Fastify log silencing**: use `{ logLevel: 'silent' }` NOT `{ disableRequestLogging: true }` (not in Fastify 4 types → tsc fail).
- **pino-pretty**: must be in `dependencies` (not devDependencies) — container crashes on startup if absent.
- **@fastify/rate-limit**: use `^8.0.0` with Fastify 4; v9 targets Fastify 5.
- **safeJson helper**: use `{} as any` fallback when accessing config properties; `safeJson<unknown>(str, null)` for settings values.
- **HA token**: `sanitizeInstance()` strips token. PATCH preserves with `token = req.body.token?.trim() || row.token`.
- **HA panels reorder route**: `PATCH /api/ha/panels/reorder` must be registered BEFORE `PATCH /api/ha/panels/:id`.
- **HA panel label**: stored as `null`; resolves `panel.label || friendly_name || entity_id` in frontend — never pre-fill.
- **HA WS**: `auth_invalid` sets `destroyed=true` to stop retry loops; backoff 5s→60s cap.
- **TRaSH sync guard**: `acquireSync()` → false if syncing; always `releaseSync` in `.finally()`. Routes return 409 if locked.
- **TRaSH notify vs apply**: notify mode stores preview and returns early; apply route calls `runSync` with `trigger='user_confirm'`.
- **TRaSH slug**: `toSlug(name)` from `trash-parser.ts` — use consistently, never derive from arr format names.
- **TRaSH circular import**: `merge-engine.ts` uses inline `require('./format-id-resolver')` to avoid circular dep.
- **TRaSH `toSlug` export**: import via `const { toSlug } = await import('../trash/trash-parser')` in routes.
- **string | null class field**: cast on assignment (`this.token = data.token as string`) when returning from method typed `Promise<string>`.
- **FST_ERR_CTP_EMPTY_JSON_BODY**: custom content-type parser in server.ts accepts empty bodies; frontend sends `body: JSON.stringify({})`.

## Deploy

1. Commit + push to `main` → GitHub Actions → "Build & Push Docker Image" → enter tag.
2. Unraid: `docker compose pull && docker compose up -d` from `/path/to/heldash`.
3. Image: `ghcr.io/kreuzbube88/heldash:<tag>` | Data: `/mnt/cache/appdata/heldash:/data`.
