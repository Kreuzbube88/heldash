# Installation

## Docker Run

```bash
docker run -d \
  --name heldash \
  -p 8282:8282 \
  -v /mnt/cache/appdata/heldash:/data \
  -e SECRET_KEY=$(openssl rand -hex 32) \
  -e SECURE_COOKIES=false \
  ghcr.io/kreuzbube88/heldash:latest
```

## Docker Compose

```yaml
services:
  heldash:
    image: ghcr.io/kreuzbube88/heldash:latest
    container_name: heldash
    ports:
      - 8282:8282
    volumes:
      - /mnt/cache/appdata/heldash:/data
      # Für Docker-Verwaltung:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Für Recyclarr-Integration:
      - /mnt/cache/appdata/recyclarr:/recyclarr
    environment:
      - SECRET_KEY=DEIN_GEHEIMER_SCHLUESSEL
      - SECURE_COOKIES=false
    restart: unless-stopped
```

## Umgebungsvariablen

| Variable | Pflicht | Standard | Beschreibung |
|---|---|---|---|
| SECRET_KEY | Ja | (unsicher) | JWT-Signierungsschlüssel. Generieren: `openssl rand -hex 32` |
| SECURE_COOKIES | Ja | false | false = HTTP (LAN), true = HTTPS (hinter Reverse Proxy mit SSL) |
| PORT | Nein | 8282 | Fastify Listen-Port |
| DATA_DIR | Nein | /data | Datenbankpfad und Icon-Verzeichnis |
| LOG_LEVEL | Nein | info | debug · info · warn · error |
| LOG_FORMAT | Nein | pretty | pretty = lesbare Ausgabe, json = strukturiert für Log-Aggregatoren |
| RECYCLARR_CONFIG_PATH | Nein | /recyclarr/recyclarr.yml | Pfad zur Recyclarr-Konfigurationsdatei |
| RECYCLARR_CONTAINER_NAME | Nein | recyclarr | Name des Recyclarr Docker-Containers |

## Erster Start

1. Container starten
2. `http://server-ip:8282` öffnen
3. Admin-Account anlegen (erscheint automatisch beim ersten Start)
4. Unter **Settings → General**: Dashboard-Titel anpassen
5. Unter **Apps**: erste Services hinzufügen

## Unraid

Community Applications Template verfügbar: `heldash.xml`

Import über **Community Applications → Import**

## Technische Details

| Schicht | Technologie |
|---|---|
| Frontend | React 18, TypeScript, Vite 5 |
| State | Zustand |
| Drag & Drop | @dnd-kit |
| Icons | lucide-react |
| Styling | Vanilla CSS, Glass Morphism |
| Backend | Fastify 4, TypeScript |
| Datenbank | SQLite (WAL-Modus) |
| Container | Docker, node:20-alpine |
| Registry | ghcr.io/kreuzbube88/heldash |
