# CLAUDE.md — HELDASH

Personal homelab dashboard. Self-hosted on Unraid, single Docker container.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript strict, Vite 5 |
| State | Zustand: useStore · useArrStore · useDockerStore · useWidgetStore · useDashboardStore · useHaStore · useRecyclarrStore · useActivityStore · useBookmarkStore · useInstanceStore |
| DnD | @dnd-kit/core + sortable + utilities |
| Icons | lucide-react (16px topbar/sidebar, 14px headers, 12px buttons) |
| Styling | Vanilla CSS, CSS custom properties, glass morphism |
| Backend | Fastify 4, TypeScript strict |
| Auth | @fastify/jwt + @fastify/cookie + bcryptjs (cost 12) |
| DB | better-sqlite3 (SQLite, WAL, no ORM) |
| HTTP | undici Pool (service ping, arr proxy, Docker socket) |
| Registry | ghcr.io/kreuzbube88/heldash |

## Architecture

- Single container: Fastify serves `/api/*` + React SPA
- Routing: single `page` string (no React Router)
- Auth: JWT httpOnly cookie; `app.authenticate` / `app.requireAdmin`
- ACL: `grp_admin` full, `grp_guest` read-only
- Dashboard: 20-col grid, apps=2 cols, widgets=4×2
- Docker: undici Pool → `/var/run/docker.sock`, SSE via `reply.hijack()`
- HA WS: one `HaWsClient` per instance, backoff 5s→60s

## Frontend Rules (HELDASH-specific)

- All API calls via `api.ts` — never `fetch` directly in components
- All state mutations via Zustand store — never `api.*` directly in components
- Shared pure functions in `utils.ts` — never redefine `normalizeUrl` or `containerCounts` inline
- `useEffect` deps: stable primitives only — never `.filter()/.map()` in dep array
- CSS in `global.css` only — no inline styles except dynamic values
- Errors → local `error` state → displayed inline in form/modal
- Status "unknown" = neutral gray dot only — no text, no tooltip

## Backend Rules (HELDASH-specific)

- Interface for every request body (`CreateXBody`, `PatchXBody`) and DB row (`XRow`)
- Return `RowType | undefined` from `.get()` — never `unknown`
- Errors: `reply.status(N).send({ error: '...' })` — codes: 400/404/413/415
- Recyclarr YAML: v8 only, no include blocks
- `sanitize()` strips `api_key`, `password_hash`, `token`, widget passwords — never in API responses
- `{ logLevel: 'silent' }` not `{ disableRequestLogging: true }` (not in Fastify 4 types)

## i18n (v1.4.0+)

Framework: react-i18next, DE (default) + EN
- **NEVER hardcode UI strings** — always `useTranslation('namespace')`
- New features: add keys to DE+EN JSON **before** coding
- Pattern: `t('common:buttons.save')` or `t('pageSpecific.key')`
- Keep untranslated: Docker, Unraid, HA, technical terms, entity IDs
- Namespaces: common (shared) + page-specific (setup, settings, docker, ha, etc.)
- Date/time formatting: adapt locale based on selected language

## Icon System (v1.4.0+)

Central: dashboardicons.com (1800+) + custom uploads
- Use `IconPicker` component — never hardcode URLs
- All entities support `icon_id`: services, widgets, bookmarks, instances, network devices
- Migration auto-runs, old uploads work as fallback
- Icons cached in DB, CDN fallback on miss

## Central Instances (v1.4.0+)

HA, Arr, Seerr, Unraid → `/instances` page only
- Creating instance auto-creates service (if URL unique)
- Instance cards on widgets page — settings only via `/instances`
- Type-specific validation: HA=token, Arr=api_key, Unraid=api_key
- Icon support via `icon_id` column

## CSS Variables

CSS: 8px spacing grid, Geist/Space Mono/JetBrains Mono, radius sm→2xl, transitions 100-500ms

## Gotchas

- **better-sqlite3**: booleans → always `value ? 1 : 0`
- **Docker Pool**: `new Pool('http://localhost', { socketPath: '/var/run/docker.sock', connections: 10 })` — NOT `undici.Client`
- **SSE hijack**: `reply.hijack()` before Docker request; errors as SSE events after
- **Self-signed TLS**: all undici agents use `connect: { rejectUnauthorized: false }`
- **HA token**: `sanitizeInstance()` strips token; PATCH preserves with `token = req.body.token?.trim() || row.token`
- **tcpPing**: always `socket.destroy()` after connect/error — never hangs
- **FST_ERR_CTP_EMPTY_JSON_BODY**: frontend sends `body: JSON.stringify({})` for empty bodies
- **pino-pretty**: must be in `dependencies` not devDependencies — crashes container if missing
- **@fastify/rate-limit**: use `^8.0.0` with Fastify 4 (v9 = Fastify 5)

## Deploy
```
Build test:     "Build & Push Docker Image" workflow → version tag
Release:        "Release Latest" workflow → bumps package.json, creates tag, sets latest
Unraid update:  docker compose pull && docker compose up -d
Image:          ghcr.io/kreuzbube88/heldash:<tag>
Data:           /mnt/cache/appdata/heldash:/data
```