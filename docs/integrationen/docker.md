# Docker

## Voraussetzungen

Der Docker-Socket muss in den Container gemountet werden:

```
-v /var/run/docker.sock:/var/run/docker.sock:ro
```

## Docker-Seite aktivieren

1. **Settings → Groups** → Gruppe auswählen
2. Tab **"Docker"** → Docker-Seitenzugriff aktivieren

> Admins haben immer Zugriff

## Funktionen

- Container-Liste mit CPU/RAM-Auslastung
- Echtzeit-Statusupdates via Docker Events stream — kein Polling
- Live-Log-Stream pro Container (stdout + stderr)
- Start / Stop / Restart (nur Admins)
- Docker Overview Widget für Dashboard/Topbar/Sidebar

> Statuswechsel (start/stop/restart) werden automatisch im Aktivitäten-Feed erfasst

## Docker Overview Widget

1. **Widgets → + Widget hinzufügen → Typ: Docker Overview**
2. Widget auf Dashboard, Topbar oder Sidebar platzieren

> Docker Widget-Zugriff muss pro Gruppe separat aktiviert werden (Settings → Groups → Docker)
