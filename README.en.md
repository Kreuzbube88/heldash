# HELDASH

> [🇩🇪 Deutsche Version](README.md)

Personal homelab dashboard with glass morphism design.
Manage services, Docker containers, media automation,
Home Assistant, Unraid and more — all in one interface.

> ⚠️ **Use at Your Own Risk**
>
> This project was developed entirely using Claude Code (AI-assisted programming).
> It has **not been reviewed by a professional developer**. The code has not been
> audited for security vulnerabilities, production readiness, or best practices.
>
> **It is explicitly NOT recommended to expose HELDASH publicly on the internet.**
> The dashboard is designed exclusively for use in local home networks (LAN).
>
> Use entirely at your own risk.

---

## Language / Sprache

🇬🇧 **English** — Fully available  
🇩🇪 **Deutsch** — Vollständig verfügbar (Standard)

**More languages:** Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md#english)

---

## Features

### **Dashboard**
- 🗂️ Modular Grid — freely arrange apps, media instances, and widgets
- 📱 Fully Responsive — optimized for desktop, tablet, and mobile
- 📦 Dashboard Groups — named containers, drag & drop, collapsible
- ✅ Dashboard & Health-Check Toggles — one-click control
- 🖱️ Edit Mode — drag & drop with touch support
- 👥 Per-User Dashboards — individual layout per user
- 👁️ Guest Visibility Overlay — admins see what guests can see

### **Navigation**
- 🖥️ Desktop: collapsible sidebar — icons + labels or icons only
- 📱 Mobile: bottom navigation bar, respects user permissions

### **Apps & Bookmarks**
- 📋 App list grouped by categories
- ➕ Add, edit, delete with icons (dashboardicons.com + custom upload)
- 🔁 Automatic HTTP health checks — server-side scheduler
- 🔖 Bookmarks page — manage external links, icons, dashboard integration

### **Icon Management**
- 🎨 1800+ icons from dashboardicons.com
- 📤 Custom icon upload (PNG, JPG, SVG)
- 🔍 Icon picker for all entities (services, widgets, bookmarks, instances, network devices)
- 💾 Automatic icon caching in database

### **Media**
- 🎬 Radarr — movie statistics, download queue, calendar
- 📺 Sonarr — series statistics, download queue, calendar
- 🔍 Prowlarr — indexer list and 24h grab statistics
- ⬇️ SABnzbd — queue with progress bars, download history
- 🔎 Seerr/Discover — TMDB integration, request movies/series

### **Recyclarr**
- 🔄 Recyclarr v8 GUI — automatically generates recyclarr.yml
- 📊 TRaSH Custom Formats grouped — score overrides, profile comparison
- 👤 Custom Formats from CF Manager
- ⏰ Sync schedule: manual, daily, weekly, cron
- 📜 Sync history of last 10 syncs

### **CF Manager**
- 📝 Create, edit, delete custom formats
- ➕ Full conditions editor
- 📥 Import from Radarr/Sonarr — automatic detection
- 📤 Export as JSON (TRaSH-compatible)
- 🔀 Copy CFs — cross-service (Radarr ↔ Sonarr)

### **Docker**
- 🐳 Live container list with CPU/RAM, state badges, uptime
- 📊 Overview bar — total / running / stopped / restarting
- 📜 Live log streaming via SSE
- ⚡ Real-time status updates via Docker Events
- ▶️ Start / stop / restart (admins only)

### **Unraid Integration**
- 💽 Array & disk overview — status, usage, SMART, parity check
- 🔌 Cache pools — type badges (HDD/SSD/NVMe)
- 🐳 Docker container management — start/stop/restart/pause
- 🖥️ VM management — status, start/stop/force-stop
- 🔔 Notifications — system notifications with archive
- 🔌 Plugins tab — installed plugins, versions, updates
- 📜 Logs tab — stream system logs live
- ⚡ UPS tab — UPS status, battery level, load
- 🔧 Multi-server support — manage multiple Unraid servers

### **Home Assistant**
- 🏠 Multi-instance support
- 🔍 Entity browser — domain filter tabs + search
- 🃏 Panel grid — domain-aware cards, real-time WebSocket, drag & drop
- 🗺️ Floor Plan — place entities on floor plan (landscape mode)
- 📍 GPS tab — person tracking on OpenStreetMap
- 🤖 Automations tab — execute, enable/disable, search
- ⚡ Energy dashboard — solar, grid, self-sufficiency chart
- 🔒 Lock/alarm cards — PIN-secured
- 🔔 HA alerts — entity state changes as toast
- 📈 Entity history — 24h/7d graph

### **Network Monitor**
- 🌐 Monitor network devices — TCP ping, 7-day history
- 📡 IP scanner — scan subnet (CIDR /20), add devices directly
- ✅ Already added devices visually marked
- 🔌 Wake-on-LAN — wake devices via magic packet
- 📊 Device groups — 24h uptime history per device

### **Backup Center**
- 💾 Central backup overview — CA Backup, Duplicati, Kopia, Docker, VMs
- 🐳 Docker config export — container configurations as JSON
- ⚠️ Automatic warnings (backup > 7 days old)
- 📖 Integrated guide: backup Unraid completely

### **Activity Log**
- 📋 Central monitoring center — all activities
- 💯 Homelab health score (0–100) — services, Docker, Recyclarr, HA
- 📅 Event calendar — GitHub graph style, 84 days
- 🔔 Anomaly detection — unstable services marked
- 📊 Tabs: activities | uptime | sync history | Docker events
- 📈 Resource history — CPU, RAM, network (24h/7d)

### **Widgets**
- 🖥️ Server status — live CPU, RAM, disks
- 🛡️ AdGuard Home / Pi-hole — DNS statistics
- 🐳 Docker overview — container counts
- 🔐 Nginx Proxy Manager — proxies, certificates
- 🏠 Home Assistant widget — entity states
- ⚡ HA energy widget — energy summary
- 📅 Calendar widget — Radarr/Sonarr upcoming releases
- 🌤️ Weather widget — Open-Meteo integration (no API key required)
- 📊 Topbar pinbar for quick overview

### **Instance Management**
- 🔗 Central management — HA, Radarr, Sonarr, Prowlarr, SABnzbd, Seerr, Unraid
- 🎨 Icon support for all instances
- ✅ Connection test when adding
- 🔄 Automatic app creation (if URL unique)

### **Auth & Access**
- 🔑 Local user authentication
- 👥 User groups (admin, guest + custom)
- 👁️ Per-group visibility
- 🔐 "Remember me" option
- 🛠️ Admin "guest mode"

### **Design & Settings**
- 🎨 Design tab — corner style, blur, spacing, sidebar style, animations, custom CSS
- 🌓 Light/dark + 3 accent colors (cyan, orange, magenta)
- 🕐 Auto-theme — time-based switching
- 🖼️ Background images — upload per user group
- 🌐 Multilingual — German, English (more languages via community)

### **Documentation & Changelog**
- 📖 Integrated documentation center in About page
- 🎉 What's New modal after updates
- 📋 All releases viewable

---

## Installation

### Unraid Community Store (Recommended)

HELDASH is available directly via the **Unraid Community Applications Store**.

1. Search for **"HELDASH"** in CA App Store
2. Install with one click
3. Open **http://server-ip:8282**
4. Admin setup on first start

---

### Docker Compose
```yaml
services:
  heldash:
    image: ghcr.io/kreuzbube88/heldash:latest
    container_name: heldash
    ports:
      - "8282:8282"
    volumes:
      - /mnt/user/appdata/heldash:/data
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /mnt/user/appdata/recyclarr:/recyclarr
      # - /boot:/boot:ro  # optional: CA Backup monitoring
    environment:
      SECRET_KEY: ${SECRET_KEY}  # openssl rand -hex 32
      SECURE_COOKIES: "false"    # true if behind HTTPS proxy
    restart: unless-stopped
```
```bash
docker compose up -d
```

Then open **http://server-ip:8282**.

---

### Docker CLI
```bash
docker run -d \
  --name heldash \
  -p 8282:8282 \
  -v /mnt/user/appdata/heldash:/data \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /mnt/user/appdata/recyclarr:/recyclarr \
  -e SECRET_KEY=$(openssl rand -hex 32) \
  -e SECURE_COOKIES=false \
  ghcr.io/kreuzbube88/heldash:latest
```

---

## Security Notice

⚠️ **HELDASH is designed exclusively for use in local home networks.**

- ❌ **DO NOT** expose publicly on the internet
- ✅ Use behind reverse proxy (e.g., Nginx Proxy Manager) with SSL
- ✅ Set `SECURE_COOKIES=true` when behind HTTPS
- ✅ Always set `SECRET_KEY`: `openssl rand -hex 32`

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SECRET_KEY` | **Yes** | insecure | JWT secret. `openssl rand -hex 32` |
| `SECURE_COOKIES` | **Yes** | `false` | `false` = HTTP local, `true` = HTTPS via reverse proxy |
| `PORT` | No | `8282` | Web server listen port |
| `DATA_DIR` | No | `/data` | Database, icons, backgrounds, floor plan images |
| `LOG_LEVEL` | No | `info` | `debug` · `info` · `warn` · `error` |
| `LOG_FORMAT` | No | `pretty` | `pretty` = readable · `json` = for log aggregators |
| `RECYCLARR_CONFIG_PATH` | No | `/recyclarr/recyclarr.yml` | Path to recyclarr.yml |
| `RECYCLARR_CONTAINER_NAME` | No | `recyclarr` | Name of Recyclarr Docker container |
| `PUID` | No | `99` | User ID for file permissions (Unraid: 99) |
| `PGID` | No | `100` | Group ID for file permissions (Unraid: 100) |

---

## Unraid

**Important Paths:**

| Container Path | Host Path (Default) | Description |
|---|---|---|
| `/data` | `/mnt/user/appdata/heldash` | Database + configuration |
| `/var/run/docker.sock` | `/var/run/docker.sock` | Docker integration (ro) |
| `/recyclarr` | `/mnt/user/appdata/recyclarr` | Recyclarr config (optional) |
| `/boot` | `/boot` | CA Backup log access (optional, read-only) |

> The `/boot` mount is only required if monitoring CA Backup as a backup source in HELDASH.

**Required Fields on Installation:**
- `SECRET_KEY` — generate in terminal: `openssl rand -hex 32`
- `SECURE_COOKIES` — `false` for local access, `true` behind HTTPS

---

## Documentation

Full documentation is available in the [`/docs`](https://github.com/kreuzbube88/heldash/tree/main/docs) directory:

- 🇬🇧 [English Documentation](docs/README.en.md)
- 🇩🇪 [Deutsche Dokumentation](docs/README.md)

**Available guides:**
- [Installation](docs/installation.en.md) · [DE](docs/installation.md)
- [Integrations](docs/integrationen/) · [Integrationen DE](docs/integrationen/)
- [Features](docs/features/) · [Features DE](docs/features/)
- [Configuration](docs/konfiguration/) · [Konfiguration DE](docs/konfiguration/)

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

**Especially looking for:**
- 🌐 Translations (French, Spanish, Italian, etc.)
- 📖 Documentation improvements
- 🐛 Bug reports with reproduction steps

---

## License

MIT License — see [LICENSE](LICENSE)

---

## Development Note

This project was developed entirely using AI assistance (Claude Code).
No professional security audit. **Use only in local home networks.**