# Directory Structure

```
heldash/
├── Dockerfile                  # 3-stage: frontend build → backend build → production
├── docker-compose.yml          # Unraid deployment config
├── .github/workflows/
│   └── docker-build.yml        # Manual image build & push to GHCR
├── frontend/
│   ├── index.html              # Sets data-theme="dark" data-accent="cyan" defaults
│   ├── vite.config.ts          # Dev proxy /api + /icons + /backgrounds → :8282
│   ├── tsconfig.json           # strict: true, paths: @/* → src/*
│   └── src/
│       ├── main.tsx            # Entry point — just mounts <App />
│       ├── App.tsx             # Root: layout, routing (page state), modals
│       ├── api.ts              # Typed fetch wrapper + all API calls
│       ├── types.ts            # Service, Group, Settings, AuthUser, UserRecord, UserGroup, Widget, Background, DockerContainer, ...
│       ├── store/
│       │   ├── useStore.ts        # Main store: services, groups, settings, auth, users, userGroups, backgrounds
│       │   ├── useArrStore.ts     # Media store: instances, statuses, stats, queues, histories
│       │   ├── useDockerStore.ts  # Docker store: containers, stats, control
│       │   ├── useWidgetStore.ts  # Widget store: widgets, stats, AdGuard toggle
│       │   ├── useDashboardStore.ts # Dashboard item store
│       │   ├── useHaStore.ts      # Home Assistant store: instances, panels, stateMap
│       │   └── useTrashStore.ts   # TRaSH store: configs, profiles, formats, preview, syncLogs, deprecated, importable
│       ├── utils.ts               # Shared utilities: normalizeUrl, containerCounts
│       ├── styles/
│       │   └── global.css      # All CSS: variables, glass, layout, components
│       ├── components/
│       │   ├── Sidebar.tsx     # Left nav (Dashboard / Apps / Media / Docker / Widgets / Home Assistant / TRaSH Guides / Settings / About)
│       │   ├── Topbar.tsx      # Date, theme controls, Add buttons, auth, topbar widget stats
│       │   ├── ServiceCard.tsx # Tile: icon, status dot, hover actions
│       │   ├── ServiceModal.tsx # Add/edit service form with icon upload
│       │   └── LoginModal.tsx  # Login form modal
│       ├── pages/
│       │   ├── Dashboard.tsx   # DnD grid: services, arr instances, widgets, placeholders
│       │   ├── ServicesPage.tsx # Table view with Dashboard & Health Check toggles (fixed-width columns)
│       │   ├── Settings.tsx    # Tabbed: General (incl. background upload), Users, Groups (Apps/Media/Widgets/Docker/Background tabs), OIDC
│       │   ├── MediaPage.tsx   # Arr/media instances (flat DnD grid)
│       │   ├── DockerPage.tsx  # Docker containers: overview bar, sortable table, log viewer
│       │   ├── WidgetsPage.tsx # Widget management + DockerOverviewContent (exported, reused by Dashboard)
│       │   ├── HaPage.tsx      # Home Assistant: multi-instance mgmt, entity browser modal, DnD panel grid
│       │   ├── TrashPage.tsx   # TRaSH Guides: instance panels, configure/preview/import modals, formats/deprecated/log tabs
│       │   └── SetupPage.tsx   # First-launch admin account creation
│       └── types/
│           ├── arr.ts          # ArrInstance, ArrStats union, SabnzbdStats, queue/history types
│           └── trash.ts        # TrashInstanceConfig, TrashFormatRow, TrashPreview, TrashSyncLogEntry, …
└── backend/
    ├── tsconfig.json           # strict: true, noEmitOnError: true
    ├── package.json            # build: "tsc" (no || true suppression)
    └── src/
        ├── server.ts           # Fastify setup, middleware, static serving, SPA fallback
        ├── types.d.ts          # FastifyInstance decorator types (authenticate, requireAdmin)
        ├── db/
        │   └── database.ts     # Schema, migrations (ALTER TABLE … ADD COLUMN)
        ├── arr/
        │   ├── base-client.ts  # ArrBaseClient: undici, shared agent, rejectUnauthorized:false
        │   ├── radarr.ts       # RadarrClient extends ArrBaseClient (v3)
        │   ├── sonarr.ts       # SonarrClient extends ArrBaseClient (v3)
        │   ├── prowlarr.ts     # ProwlarrClient extends ArrBaseClient (v1)
        │   └── sabnzbd.ts      # SabnzbdClient — own undici client, no inheritance
        ├── clients/
        │   ├── nginx-pm-client.ts # NginxPMClient: Nginx Proxy Manager API integration
        │   ├── ha-ws-client.ts    # HaWsClient: single HA WebSocket connection, auth handshake, subscribe_events, auto-reconnect
        │   └── ha-ws-manager.ts   # Singleton pool of HaWsClient keyed by instanceId; invalidate on PATCH/DELETE
        ├── trash/
        │   ├── types.ts           # All shared TRaSH types (NormalizedCustomFormat, ArrSnapshot, Changeset, SyncReport, …)
        │   ├── github-fetcher.ts  # Incremental GitHub fetch: commit SHA + per-file SHA comparison
        │   ├── trash-parser.ts    # Two-pass JSON parser: CFs → slug map → quality profiles; conditions hash
        │   ├── format-id-resolver.ts # In-memory slug→ArrId mapping with DB persistence; O(1) lookup
        │   ├── arr-rate-limiter.ts   # Token bucket (5 req/s per instance); per-instance singleton pool
        │   ├── client-interface.ts   # TrashArrClient interface (CF + profile CRUD)
        │   ├── merge-engine.ts    # Pure changeset computation (no external calls); phases A-E
        │   ├── sync-executor.ts   # Executes changeset phases A-E with checkpoint safety + audit log
        │   ├── repair-engine.ts   # Drift detection: missing_in_arr, conditions_drift, deprecated_still_enabled
        │   ├── migration-runner.ts # Re-normalizes cache rows where schema_version < PARSER_SCHEMA_VERSION
        │   └── scheduler.ts       # Per-instance timers with 2s stagger; acquireSync/releaseSync guard
        └── routes/
            ├── services.ts     # CRUD + /check + /check-all + /icon upload
            ├── groups.ts       # CRUD for service groups
            ├── settings.ts     # Key-value settings store
            ├── auth.ts         # /setup, /login, /logout, /status, /me
            ├── users.ts        # User CRUD + user-group CRUD + visibility endpoints
            ├── arr.ts          # Arr instance CRUD + server-side proxy routes
            ├── widgets.ts      # Widget CRUD + stats endpoints + icon upload
            ├── dashboard.ts    # Dashboard item management (ordered list, per-owner)
            ├── docker.ts       # Docker Engine API proxy (containers, stats, logs SSE, control)
            ├── backgrounds.ts  # Background image CRUD + assign to user group
            ├── ha.ts           # Home Assistant: instance CRUD + HA proxy (states, service calls) + panel CRUD + SSE stream
            └── trash.ts        # TRaSH Guides: configure, sync, preview, apply, overrides, log, deprecated, import
```
