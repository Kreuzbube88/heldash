# HELDASH

> [🇬🇧 English version](README.en.md)

Persönliches Homelab-Dashboard mit Glass-Morphism Design.
Verwalte Services, Docker-Container, Media-Automation,
Home Assistant, Unraid und mehr — alles in einer Oberfläche.

> ⚠️ **Nutzung auf eigenes Risiko**
>
> Dieses Projekt wurde vollständig mit Claude Code (KI-gestützte Programmierung)
> entwickelt. Es hat **keine manuelle Code-Review durch einen professionellen
> Entwickler** stattgefunden. Der Code wurde nicht auf Sicherheitslücken,
> Produktionsreife oder Best Practices geprüft.
>
> **Es wird ausdrücklich NICHT empfohlen, HELDASH öffentlich im Internet
> bereitzustellen.** Das Dashboard ist ausschließlich für den Einsatz im
> lokalen Heimnetzwerk (LAN) gedacht.
>
> Die Nutzung erfolgt vollständig auf eigenes Risiko.

---

## Sprache / Language

🇩🇪 **Deutsch** — Vollständig verfügbar (Standard)  
🇬🇧 **English** — Fully available

**Weitere Sprachen:** Contributions willkommen! Siehe [CONTRIBUTING.md](CONTRIBUTING.md#deutsch)

---

## Features

### **Dashboard**
- 🗂️ Modulares Grid — Apps, Media-Instanzen und Widgets frei anordnen
- 📱 Vollständig responsiv — Desktop, Tablet und Mobile optimiert
- 📦 Dashboard-Gruppen — benannte Container, Drag & Drop, kollabierbar
- ✅ Dashboard & Health-Check Toggles — Ein-Klick-Steuerung
- 🖱️ Edit-Modus — Drag & Drop mit Touch-Unterstützung
- 👥 Per-User Dashboards — eigenes Layout pro Nutzer
- 👁️ Gast-Sichtbarkeits-Overlay — Admins sehen direkt welche Elemente für Gäste sichtbar sind

### **Navigation**
- 🖥️ Desktop: kollabierbare Sidebar — Icons + Labels oder nur Icons
- 📱 Mobile: Bottom-Navigation-Bar, respektiert Nutzerberechtigungen

### **Apps & Bookmarks**
- 📋 App-Liste gruppiert nach Kategorien
- ➕ Hinzufügen, bearbeiten, löschen mit Icon (dashboardicons.com + Custom Upload)
- 🔁 Automatische Health-Checks per HTTP — serverseitiger Scheduler
- 🔖 Bookmarks-Seite — externe Links verwalten, Icons, Dashboard-Integration

### **Icon-Management**
- 🎨 1800+ Icons von dashboardicons.com
- 📤 Custom Icon-Upload (PNG, JPG, SVG)
- 🔍 Icon-Picker für alle Entities (Services, Widgets, Bookmarks, Instanzen, Netzwerkgeräte)
- 💾 Automatisches Icon-Caching in Datenbank

### **Media**
- 🎬 Radarr — Film-Statistiken, Download-Queue, Kalender
- 📺 Sonarr — Serien-Statistiken, Download-Queue, Kalender
- 🔍 Prowlarr — Indexer-Liste und 24h-Grab-Statistiken
- ⬇️ SABnzbd — Queue mit Fortschrittsbalken, Download-Verlauf
- 🔎 Seerr/Discover — TMDB Integration, Filme/Serien requesten

### **Recyclarr**
- 🔄 Recyclarr v8 GUI — recyclarr.yml automatisch generiert
- 📊 TRaSH Custom Formats nach Gruppen — Score-Overrides, Profil-Vergleich
- 👤 Eigene Custom Formats aus CF-Manager
- ⏰ Sync-Zeitplan: manuell, täglich, wöchentlich, Cron
- 📜 Sync-Verlauf der letzten 10 Syncs

### **CF-Manager**
- 📝 Eigene Custom Formats erstellen, bearbeiten, löschen
- ➕ Vollständiger Conditions-Editor
- 📥 Import aus Radarr/Sonarr — automatische Erkennung
- 📤 Export als JSON (TRaSH-kompatibel)
- 🔀 CF kopieren — cross-service (Radarr ↔ Sonarr)

### **Docker**
- 🐳 Live-Container-Liste mit CPU/RAM, State-Badges, Uptime
- 📊 Übersichtsleiste — Total / Running / Stopped / Restarting
- 📜 Live-Log-Streaming per SSE
- ⚡ Echtzeit-Statusupdates via Docker Events
- ▶️ Start / Stop / Restart (nur Admins)

### **Unraid Integration**
- 💽 Array & Disk-Übersicht — Status, Auslastung, SMART, Parity Check
- 🔌 Cache Pools — Typ-Badges (HDD/SSD/NVMe)
- 🐳 Docker Container Management — Start/Stop/Restart/Pause
- 🖥️ VM Management — Status, Start/Stop/Force-Stop
- 🔔 Notifications — System-Benachrichtigungen mit Archiv
- 🔌 Plugins Tab — installierte Plugins, Versionen, Updates
- 📜 Logs Tab — System-Logs live streamen
- ⚡ UPS Tab — USV-Status, Batteriestand, Last
- 🔧 Multi-Server Support — mehrere Unraid-Server parallel

### **Home Assistant**
- 🏠 Multi-Instanz-Support
- 🔍 Entity-Browser — Domain-Filter-Tabs + Suche
- 🃏 Panel-Grid — domain-aware Karten, Echtzeit-WebSocket, Drag & Drop
- 🗺️ Hausübersicht — Grundriss mit platzierbaren Entities (Landscape-Modus)
- 📍 GPS-Tab — Personen-Tracking auf OpenStreetMap
- 🤖 Automationen-Tab — ausführen, aktivieren/deaktivieren, Suche
- ⚡ Energie-Dashboard — Solar, Netz, Autarkie-Chart
- 🔒 Lock/Alarm-Karten — PIN-gesichert
- 🔔 HA Alerts — Entity-Zustandsänderungen als Toast
- 📈 Entity-Verlauf — 24h/7T Graph

### **Netzwerk-Monitor**
- 🌐 Netzwerk-Geräte überwachen — TCP-Ping, 7-Tage-Historie
- 📡 IP-Scanner — Subnetz scannen (CIDR /20), Geräte direkt hinzufügen
- ✅ Bereits hinzugefügte Geräte visuell markiert
- 🔌 Wake-on-LAN — Geräte per Magic Packet aufwecken
- 📊 Geräte-Gruppen — 24h Uptime-Verlauf pro Gerät

### **Backup Center**
- 💾 Zentrale Backup-Übersicht — CA Backup, Duplicati, Kopia, Docker, VMs
- 🐳 Docker Config Export — Container-Konfigurationen als JSON
- ⚠️ Automatische Warnungen (Backup > 7 Tage alt)
- 📖 Integrierter Leitfaden: Unraid vollständig sichern

### **Logbuch**
- 📋 Zentrales Monitoring-Center — alle Aktivitäten
- 💯 Homelab Health Score (0–100) — Services, Docker, Recyclarr, HA
- 📅 Ereignis-Kalender — GitHub-Graph-Stil, 84 Tage
- 🔔 Anomalie-Erkennung — instabile Services markiert
- 📊 Tabs: Aktivitäten | Uptime | Sync-Verlauf | Docker Events
- 📈 Ressourcen-Verlauf — CPU, RAM, Netzwerk (24h/7T)

### **Widgets**
- 🖥️ Server Status — Live CPU, RAM, Festplatten
- 🛡️ AdGuard Home / Pi-hole — DNS-Statistiken
- 🐳 Docker Overview — Container-Counts
- 🔐 Nginx Proxy Manager — Proxies, Zertifikate
- 🏠 Home Assistant Widget — Entity-States
- ⚡ HA Energy Widget — Energie-Zusammenfassung
- 📅 Kalender-Widget — Radarr/Sonarr Upcoming-Releases
- 🌤️ Wetter-Widget — Open-Meteo Integration (keine API-Key nötig)
- 📊 Topbar-Pinbar für Schnellübersicht

### **Instanzen-Verwaltung**
- 🔗 Zentrale Verwaltung — HA, Radarr, Sonarr, Prowlarr, SABnzbd, Seerr, Unraid
- 🎨 Icon-Support für alle Instanzen
- ✅ Verbindungstest beim Hinzufügen
- 🔄 Automatische App-Erstellung (wenn URL unique)

### **Auth & Zugriff**
- 🔑 Lokale Nutzer-Authentifizierung
- 👥 Nutzergruppen (Admin, Gast + eigene)
- 👁️ Per-Gruppe Sichtbarkeit
- 🔐 "Angemeldet bleiben" Option
- 🛠️ Admin "Gast-Modus"

### **Design & Einstellungen**
- 🎨 Design-Tab — Ecken-Stil, Blur, Abstände, Sidebar-Stil, Animationen, Custom CSS
- 🌓 Hell/Dunkel + 3 Akzentfarben (Cyan, Orange, Magenta)
- 🕐 Auto-Theme — zeitbasierter Wechsel
- 🖼️ Hintergrundbilder — Upload pro Nutzergruppe
- 🌐 Mehrsprachig — Deutsch, Englisch (weitere Sprachen via Community)

### **Dokumentation & Changelog**
- 📖 Integriertes Doku-Center in About-Seite
- 🎉 What's New Modal nach Updates
- 📋 Alle Releases einsehbar

---

## Installation

### Unraid Community Store (Empfohlen)

HELDASH ist direkt über den **Unraid Community Applications Store** verfügbar.

1. Im CA App Store nach **„HELDASH"** suchen
2. Mit einem Klick installieren
3. **http://server-ip:8282** öffnen
4. Admin-Einrichtung beim ersten Start

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
      SECURE_COOKIES: "false"    # true wenn hinter HTTPS-Proxy
    restart: unless-stopped
```
```bash
docker compose up -d
```

Dann **http://server-ip:8282** öffnen.

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

## Sicherheitshinweis

⚠️ **HELDASH ist ausschließlich für den lokalen Einsatz im Heimnetzwerk gedacht.**

- ❌ **NICHT** öffentlich im Internet bereitstellen
- ✅ Hinter Reverse Proxy (z.B. Nginx Proxy Manager) mit SSL betreiben
- ✅ `SECURE_COOKIES=true` wenn hinter HTTPS
- ✅ `SECRET_KEY` immer setzen: `openssl rand -hex 32`

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

## Unraid

**Wichtige Pfade:**

| Pfad im Container | Host-Pfad (Standard) | Beschreibung |
|---|---|---|
| `/data` | `/mnt/user/appdata/heldash` | Datenbank + Konfiguration |
| `/var/run/docker.sock` | `/var/run/docker.sock` | Docker-Integration (ro) |
| `/recyclarr` | `/mnt/user/appdata/recyclarr` | Recyclarr Config (optional) |
| `/boot` | `/boot` | CA Backup Log-Zugriff (optional, read-only) |

> Der `/boot` Mount ist nur erforderlich wenn CA Backup als
> Backup-Quelle in HELDASH überwacht werden soll.

**Pflichtfelder bei Installation:**
- `SECRET_KEY` — `openssl rand -hex 32` im Terminal generieren
- `SECURE_COOKIES` — `false` für lokalen Zugriff, `true` bei HTTPS

---

## Dokumentation

Die vollständige Dokumentation findest du im [`/docs`](https://github.com/kreuzbube88/heldash/tree/main/docs) Verzeichnis:

- 🇩🇪 [Deutsche Dokumentation](docs/README.md)
- 🇬🇧 [English Documentation](docs/README.en.md)

**Verfügbare Guides:**
- [Installation](docs/installation.md) · [EN](docs/installation.en.md)
- [Integrationen](docs/integrationen/) · [Integrations EN](docs/integrationen/)
- [Features](docs/features/) · [Features EN](docs/features/)
- [Konfiguration](docs/konfiguration/) · [Configuration EN](docs/konfiguration/)

---

## Contributing

Contributions sind willkommen! Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

**Besonders gesucht:**
- 🌐 Übersetzungen (Französisch, Spanisch, Italienisch, etc.)
- 📖 Dokumentations-Verbesserungen
- 🐛 Bug Reports mit Reproduktionsschritten

---

## Lizenz

MIT License — siehe [LICENSE](LICENSE)

---

## Hinweis zur Entwicklung

Dieses Projekt wurde vollständig mit KI-Unterstützung (Claude Code) entwickelt.
Keine professionelle Sicherheitsprüfung. **Nur im lokalen Heimnetzwerk nutzen.**