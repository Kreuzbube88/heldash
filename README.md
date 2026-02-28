# ⬡ HELDASH

A personal homelab dashboard with a clean Liquid Glass design.

Coded by Claude.ai because iam to stupid to code but can wirte prompts lol

## Bug reports, improvements, and feature requests are welcome via issues. :)

## Features

- 🔗 Service/app link management with online status monitoring
- 🎨 Light/Dark mode + accent colors (Cyan, Orange, Magenta)
- 🗂️ Groups / categories for organizing apps
- 🖱️ Drag & Drop reordering for apps and groups
- 🔒 Local user authentication — admin setup on first launch
- 👥 User groups (Admin, Guest + custom)
- 💾 SQLite persistence — all data survives container restarts
- 🐳 Single Docker container, minimal footprint
- 🔑 OIDC-ready user data model (integration coming later)

## Quick Start

```bash
docker run -d \
  --name heldash \
  -p 8282:8282 \
  -v /mnt/cache/appdata/heldash:/data \
  -e SECRET_KEY=your_random_secret_here \
  ghcr.io/kreuzbube88/heldash:latest
```

Or with docker-compose:

```bash
docker compose up -d
```

Then open **http://your-server:8282**

On first launch you will be prompted to create an admin account.

## Authentication

- **First launch:** A setup page appears to create the admin user (username, first/last name, optional email, password)
- **Public access:** The dashboard is readable without logging in
- **Admin login:** Required to add, edit, delete apps and groups, and manage users
- **User groups:** Admin and Guest are built-in; admins can create additional groups
- **OIDC preparation:** User records include email, first/last name, and OIDC fields — ready for future voidauth integration

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8282` | Listening port |
| `DATA_DIR` | `/data` | Data directory (mount here) |
| `SECRET_KEY` | — | **Recommended.** Secret for JWT signing. Uses insecure default if unset. |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `NODE_ENV` | `production` | Environment |

## Building

The Docker image is built manually via GitHub Actions:

1. Go to **Actions → Build & Push Docker Image**
2. Click **Run workflow**
3. Enter a tag (e.g. `latest` or `1.0.0`)

## Data Structure

All data is stored under `DATA_DIR`:

```
/data
├── db/
│   └── heldash.db    ← SQLite database
└── icons/
    └── *.png/jpg/svg ← Uploaded app icons
```

## Development

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

Frontend dev server runs on :5173 and proxies API calls to :8282.

## Roadmap

- [x] App management + status checks
- [x] Groups / categories
- [x] Light/Dark + accent themes
- [x] Drag & Drop reordering
- [x] Local user authentication
- [x] User groups (Admin, Guest, custom)
- [ ] OIDC via voidauth
- [ ] API integrations (*arr stack, Immich, Emby, Unraid, ...)
- [ ] Widget system
