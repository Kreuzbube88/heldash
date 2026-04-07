<p align="center">
  <img src="frontend/public/logo.png" alt="HELDASH" width="450" height="450"/>
</p>

<p align="center">
  <strong>Persönliches Homelab-Dashboard für Unraid</strong>
</p>

<p align="center">
  🇩🇪 Deutsch &nbsp;|&nbsp; <a href="README.en.md">🇬🇧 English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-active-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/node-%3E%3D24.0.0-brightgreen" alt="Node.js">
  <img src="https://img.shields.io/github/license/Kreuzbube88/heldash" alt="License">
  <img src="https://img.shields.io/badge/platform-Unraid-orange" alt="Platform">
</p>

---

HELDASH ist ein selbst-gehostetes Homelab-Dashboard, speziell für [Unraid](https://unraid.net). Es läuft als einzelner Docker-Container und bietet eine einheitliche Oberfläche für Services, Docker-Container, Media-Automation, Home Assistant, Netzwerkgeräte und mehr — mit Glass-Morphism UI, ohne Cloud-Abhängigkeit und ohne Subscription.

> ⚠️ **Nutzung auf eigenes Risiko**
>
> Dieses Projekt wurde vollständig mit KI-Unterstützung (Claude Code) entwickelt. Es hat **keine manuelle Code-Review durch einen professionellen Entwickler** stattgefunden. Der Code wurde nicht auf Sicherheitslücken, Produktionsreife oder Best Practices geprüft.
>
> **Es wird ausdrücklich NICHT empfohlen, HELDASH öffentlich im Internet bereitzustellen.** Das Dashboard ist ausschließlich für den Einsatz im lokalen Heimnetzwerk (LAN) gedacht.

---

## Features

- **Dashboard** — Modulares Grid mit Apps, Widgets und Bookmarks; Drag & Drop, kollabierbare Gruppen, Per-User-Layouts
- **Docker** — Live-Container-Liste mit CPU/RAM, Log-Streaming, Echtzeit-Status via Docker Events
- **Home Assistant** — Multi-Instanz, Entity-Browser, Panel-Grid, Grundriss, GPS-Tracking, Automationen, Energie-Dashboard, Entity-Verlauf
- **Media** — Radarr, Sonarr, Prowlarr, SABnzbd, Seerr/Discover mit Statistiken, Queues und Kalendern
- **Recyclarr + CF-Manager** — TRaSH Guides Sync GUI, Custom-Format-Editor, Import/Export
- **Unraid Integration** — Array & Disk-Übersicht, Cache Pools, VM-Management, Notifications, Plugins, Logs, UPS
- **Netzwerk-Monitor** — TCP-Ping, 7-Tage-Historie, IP-Scanner, Wake-on-LAN, Geräte-Gruppen
- **Widgets** — Server-Stats, AdGuard/Pi-hole, Docker, Nginx PM, HA Entities, Wetter, Kalender
- **Icon-System** — 1800+ Icons von dashboardicons.com + Custom-Upload, Icon-Picker für alle Entities
- **Auth & Zugriff** — Lokale Nutzer, Gruppen (Admin, Gast, Custom), Per-Gruppe-Sichtbarkeit, „Angemeldet bleiben"
- **i18n** — Deutsch (Standard) + Englisch; Community-Übersetzungen willkommen
- **Design** — Glass Morphism, Hell/Dunkel, 3 Akzentfarben, Auto-Theme, Custom CSS, Hintergrundbilder

---

## Installation

### Unraid Community Apps (empfohlen)

1. **Apps**-Tab in Unraid öffnen
2. Nach **HELDASH** suchen
3. **Install** klicken und Template folgen

HELDASH ist dann erreichbar unter `http://SERVER-IP:8282`.

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
      # - /boot:/boot:ro  # optional: CA Backup Monitoring
    environment:
      - SECRET_KEY=your_secret_here   # openssl rand -hex 32
      - SECURE_COOKIES=false          # true wenn hinter HTTPS-Proxy
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

## Umgebungsvariablen

| Variable | Pflicht | Standard | Beschreibung |
|---|---|---|---|
| `SECRET_KEY` | **Ja** | unsicher | JWT-Schlüssel. `openssl rand -hex 32` |
| `SECURE_COOKIES` | **Ja** | `false` | `false` = HTTP lokal, `true` = HTTPS via Reverse Proxy |
| `PORT` | Nein | `8282` | Listen-Port des Webservers |
| `DATA_DIR` | Nein | `/data` | Datenbank, Icons, Hintergründe, Grundriss-Bilder |
| `LOG_LEVEL` | Nein | `info` | `debug` · `info` · `warn` · `error` |
| `LOG_FORMAT` | Nein | `pretty` | `pretty` = lesbar · `json` = für Log-Aggregatoren |
| `RECYCLARR_CONFIG_PATH` | Nein | `/recyclarr/recyclarr.yml` | Pfad zur recyclarr.yml |
| `RECYCLARR_CONTAINER_NAME` | Nein | `recyclarr` | Name des Recyclarr Docker-Containers |
| `PUID` | Nein | `99` | User-ID für Dateiberechtigungen (Unraid: 99) |
| `PGID` | Nein | `100` | Group-ID für Dateiberechtigungen (Unraid: 100) |

---

## Voraussetzungen

- **Docker socket** `/var/run/docker.sock` — erforderlich für Docker-Integration
- **Data-Volume** `/data` — Datenbank, Icons und Konfiguration
- **Recyclarr-Volume** `/recyclarr` — optional, für Recyclarr-Sync
- **Boot-Mount** `/boot` — optional, für CA Backup Monitoring

---

## Dokumentation

Die vollständige Dokumentation ist im [`docs/`](docs/README.md)-Verzeichnis verfügbar — auf Deutsch und Englisch.

---

## Contributing

Contributions sind willkommen! Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

**Besonders gesucht:**
- 🌐 Übersetzungen (Französisch, Spanisch, Italienisch, etc.)
- 📖 Dokumentations-Verbesserungen
- 🐛 Bug Reports mit Reproduktionsschritten

---

## Lizenz

MIT © 2024 HEL*Apps
