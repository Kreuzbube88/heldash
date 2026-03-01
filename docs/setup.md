# HELDASH — Setup & Deployment

## Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [Schnellstart mit Docker](#schnellstart-mit-docker)
3. [docker-compose (empfohlen)](#docker-compose-empfohlen)
4. [Umgebungsvariablen](#umgebungsvariablen)
5. [Datenvolume & Dateistruktur](#datenvolume--dateistruktur)
6. [Netzwerk & Reverse Proxy](#netzwerk--reverse-proxy)
7. [Unraid (Community Applications)](#unraid-community-applications)
8. [Erster Start](#erster-start)
9. [Updates](#updates)
10. [Docker-Seite aktivieren](#docker-seite-aktivieren)
11. [Healthcheck](#healthcheck)

---

## Voraussetzungen

- Docker Engine ≥ 20.x
- Zugriff auf Port 8282 (oder ein beliebiger freier Port)
- Ein beschreibbares Verzeichnis auf dem Host für persistente Daten (Datenbank + Icons)
- Optional: Zugriff auf `/var/run/docker.sock` wenn die Docker-Seite genutzt werden soll

---

## Schnellstart mit Docker

```bash
docker run -d \
  --name heldash \
  -p 8282:8282 \
  -v /mnt/cache/appdata/heldash:/data \
  -e SECRET_KEY=$(openssl rand -hex 32) \
  -e SECURE_COOKIES=false \
  ghcr.io/kreuzbube88/heldash:latest
```

Danach ist das Dashboard unter `http://<server-ip>:8282` erreichbar.

---

## docker-compose (empfohlen)

```yaml
services:
  heldash:
    image: ghcr.io/kreuzbube88/heldash:latest
    container_name: heldash
    restart: unless-stopped
    ports:
      - "8282:8282"
    volumes:
      - /mnt/cache/appdata/heldash:/data
      # Optional: Docker-Seite aktivieren
      # - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - SECRET_KEY=HIER_EINEN_ZUFAELLIGEN_WERT_EINTRAGEN
      - SECURE_COOKIES=false
      - LOG_LEVEL=info
```

`SECRET_KEY` generieren:

```bash
openssl rand -hex 32
```

---

## Umgebungsvariablen

| Variable | Pflichtfeld | Standard | Beschreibung |
|---|---|---|---|
| `SECRET_KEY` | **Ja** | unsicherer Fallback | Schlüssel zum Signieren der JWT-Auth-Tokens. Muss ein langer, zufälliger String sein. Beim Ändern werden alle bestehenden Sessions ungültig. |
| `SECURE_COOKIES` | **Ja** | `false` | `false` = HTTP (direkter LAN-Zugriff ohne TLS). `true` = HTTPS (hinter nginx-proxy-manager oder einem anderen TLS-Proxy). Bei `true` werden Cookies mit dem `Secure`-Flag gesetzt — Login funktioniert dann **nur** über HTTPS. |
| `LOG_LEVEL` | Nein | `info` | Verbosität des Logs: `debug` · `info` · `warn` · `error` |

### Wichtig: SECRET_KEY

Der `SECRET_KEY` darf nie leer bleiben oder ein trivialer Wert sein. Fehlt er, startet der Server mit einem unsicheren Fallback und gibt eine Warnung im Log aus. Beim Neuerzeugen des Schlüssels werden **alle aktiven Logins ungültig** (alle Benutzer müssen sich neu anmelden).

### Wichtig: SECURE_COOKIES

| Szenario | Einstellung |
|---|---|
| Direktzugriff über `http://192.168.x.x:8282` | `SECURE_COOKIES=false` |
| Zugriff über HTTPS-Domain hinter npm/Caddy/Traefik | `SECURE_COOKIES=true` |

Falsche Einstellung = Login scheinbar erfolgreich, aber Session wird sofort verworfen.

---

## Datenvolume & Dateistruktur

Alle persistenten Daten liegen unter `/data` im Container. Dieser Pfad muss als Volume eingebunden werden, damit Daten Container-Neustarts und -Updates überleben.

```
/data
├── db/
│   └── heldash.db       ← SQLite-Datenbank (alle Apps, Benutzer, Einstellungen)
└── icons/
    └── *.png/jpg/svg    ← Hochgeladene App-Icons
```

Es werden keine weiteren externen Dienste (Postgres, Redis, etc.) benötigt.

### Backup

Ein Backup der gesamten Installation besteht aus einer einzigen Kopie des `/data`-Verzeichnisses. Bei laufendem Container empfiehlt sich das SQLite-Backup-Tool:

```bash
docker exec heldash sqlite3 /data/db/heldash.db ".backup /data/db/heldash_backup.db"
```

---

## Netzwerk & Reverse Proxy

Der Container exposed nur einen einzigen Port (Standard: 8282). Es läuft **kein** Nginx o.ä. im Container — Fastify bedient direkt sowohl die API als auch die statische Frontend-App.

### Hinter nginx-proxy-manager

1. Neuen Proxy-Host anlegen: `http://container-ip:8282`
2. SSL-Zertifikat (Let's Encrypt) aktivieren
3. Im Container `SECURE_COOKIES=true` setzen

### Wichtige Header

Wenn der Reverse Proxy `X-Forwarded-*`-Header setzt, werden diese von Fastify ausgewertet. Für korrektes IP-Logging in den Fastify-Logs sollte `trustProxy: true` im Serverkonfig aktiv sein (ist standardmäßig gesetzt).

### Für die Docker-Seite: Socket-Mount

Die Docker-Seite kommuniziert direkt mit der Docker Engine über den Unix-Socket. Dafür muss der Socket in den Container gemountet werden:

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

Das `:ro` (read-only) reicht vollständig aus — auch Start, Stop und Restart von Containern funktionieren damit.

### Festplatten für das Server-Status-Widget

Damit das Server-Status-Widget den Belegungsstand einzelner Festplatten anzeigen kann, müssen diese ebenfalls als Pfade in den Container gemountet werden. `:ro` ist ausreichend:

```yaml
volumes:
  - /mnt/disk1:/hdd1:ro
  - /mnt/disk2:/hdd2:ro
  - /mnt/cache:/cache:ro
```

Die Pfade (`/hdd1`, `/hdd2`, ...) werden anschließend im Widget-Formular unter „Festplatten" eingetragen. Ohne diesen Mount kann der Container den Speicherstand der Festplatte nicht auslesen.

> **Sicherheitshinweis:** Der Docker-Socket gibt dem Container vollen Zugriff auf die Docker Engine des Hosts. In einem Heimlabor-Umfeld (single-user, trusted network) ist dies vertretbar. In Multi-Tenant-Umgebungen sollte ein Docker-Socket-Proxy (z.B. Tecnativa/docker-socket-proxy) vorgeschaltet werden.

---

## Unraid (Community Applications)

Eine fertige Community Applications-Vorlage ist im Repository als `heldash.xml` enthalten.

**Import:**
1. Community Applications → App öffnen
2. Oben rechts auf „Vorlagen importieren" klicken
3. URL der Rohdatei aus dem GitHub-Repository einfügen
4. Template erscheint mit allen Feldern vorausgefüllt

---

## Erster Start

Beim allerersten Start existieren noch keine Benutzer in der Datenbank. Das Dashboard erkennt dies automatisch und zeigt anstelle der normalen Oberfläche eine **Setup-Seite**, auf der der erste Admin-Account angelegt wird.

1. Browser öffnen: `http://<server>:8282`
2. Benutzername und Passwort für den Admin wählen
3. „Admin-Account erstellen" klicken
4. Das Dashboard ist direkt einsatzbereit

Danach kann der Admin unter **Einstellungen → Benutzer** weitere Benutzer anlegen und Gruppen konfigurieren.

---

## Updates

```bash
# Image aktualisieren
docker compose pull

# Container neu starten
docker compose up -d
```

Datenbankmigrationen werden **automatisch** beim Start des neuen Containers durchgeführt. Neue Spalten oder Tabellen werden hinzugefügt, ohne bestehende Daten zu verändern.

---

## Docker-Seite aktivieren

Damit die Docker-Seite im Sidebar erscheint und Containerlisten/Logs abrufbar sind, müssen zwei Dinge erfüllt sein:

1. **Socket gemountet** (siehe [Netzwerk-Abschnitt](#für-die-docker-seite-socket-mount))
2. **Gruppe berechtigt:** Unter Einstellungen → Gruppen → [Gruppe wählen] → Tab „Docker" den Haken bei „Docker-Seite" setzen

Admins haben immer Zugriff. Für andere Gruppen muss der Zugriff explizit aktiviert werden.

---

## Healthcheck

Der Container meldet seinen Status über einen eingebauten HTTP-Healthcheck:

```
GET /api/health
→ { "status": "ok", "version": "...", "uptime": 123.4 }
```

Docker überprüft diesen Endpunkt alle 30 Sekunden. Fällt er aus, wird der Container als `unhealthy` markiert.
