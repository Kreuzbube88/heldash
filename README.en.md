<p align="center">
  <img src="frontend/public/logo.png" alt="HELDASH" width="450" height="450"/>
</p>

<p align="center">
  <strong>Personal Homelab Dashboard for Unraid</strong>
</p>

<p align="center">
  <a href="README.md">🇩🇪 Deutsch</a> &nbsp;|&nbsp; 🇬🇧 English
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-active-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen" alt="Node.js">
  <img src="https://img.shields.io/github/license/Kreuzbube88/heldash" alt="License">
  <img src="https://img.shields.io/badge/platform-Unraid-orange" alt="Platform">
</p>

---

HELDASH is a self-hosted homelab dashboard, purpose-built for [Unraid](https://unraid.net). It runs as a single Docker container and provides a unified interface for services, Docker containers, media automation, Home Assistant, network devices and more — with a glass morphism UI, no cloud dependency and no subscription.

> ⚠️ **Use at Your Own Risk**
>
> This project was developed entirely using AI assistance (Claude Code). It has **not been reviewed by a professional developer**. The code has not been audited for security vulnerabilities, production readiness, or best practices.
>
> **It is explicitly NOT recommended to expose HELDASH publicly on the internet.** The dashboard is designed exclusively for use in local home networks (LAN).

---

## Features

- **Dashboard** — Modular grid with apps, widgets and bookmarks; drag & drop, collapsible groups, per-user layouts
- **Docker** — Live container list with CPU/RAM, log streaming, real-time status via Docker Events
- **Home Assistant** — Multi-instance, entity browser, panel grid, floor plan, GPS tracking, automations, energy dashboard, entity history
- **Media** — Radarr, Sonarr, Prowlarr, SABnzbd, Seerr/Discover, qBittorrent with statistics, queues and calendars
- **Recyclarr + CF Manager** — TRaSH Guides sync GUI, custom format editor, import/export
- **Unraid Integration** — Array & disk overview, cache pools, VM management, notifications, plugins, logs, UPS
- **Network Monitor** — TCP ping, 7-day history, IP scanner, Wake-on-LAN, device groups
- **Widgets** — Server stats, AdGuard/Pi-hole, Docker, Nginx PM, HA entities, weather, calendar
- **Icon System** — 1800+ icons from dashboardicons.com + custom upload, icon picker for all entities
- **Auth & Access** — Local users, groups (admin, guest, custom), per-group visibility, "remember me"
- **i18n** — English + German (default); community translations welcome
- **Design** — Glass morphism, light/dark, 3 accent colors, auto-theme, custom CSS, background images

---

## Installation

### Unraid Community Apps (Recommended)

1. Open the **Apps** tab in Unraid
2. Search for **HELDASH**
3. Click **Install** and follow the template

HELDASH will then be available at `http://SERVER-IP:8282`.

### Docker Compose

```yaml
services:
  heldash:
    image: ghcr.io/kreuzbube88/heldash:latest
    container_name: heldash
    restart: unless-stopped
    ports:
      - "8282:8282"
    volumes:
      - /mnt/user/appdata/heldash:/data
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /mnt/user/appdata/recyclarr:/recyclarr
      # - /boot:/boot:ro  # optional: CA Backup monitoring
    environment:
      - SECRET_KEY=your_secret_here   # openssl rand -hex 32
      - SECURE_COOKIES=false          # true if behind HTTPS proxy
```

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

## Prerequisites

- **Docker socket** `/var/run/docker.sock` — required for Docker integration
- **Data volume** `/data` — database, icons and configuration
- **Recyclarr volume** `/recyclarr` — optional, for Recyclarr sync
- **Boot mount** `/boot` — optional, for CA Backup monitoring

---

## Documentation

Full documentation is available in the [`docs/`](docs/README.md) directory — in English and German.

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

**Especially looking for:**
- 🌐 Translations (French, Spanish, Italian, etc.)
- 📖 Documentation improvements
- 🐛 Bug reports with reproduction steps

---

## License

MIT © HEL*Apps
