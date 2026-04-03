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
      # For Docker management:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # For Recyclarr integration:
      - /mnt/cache/appdata/recyclarr:/recyclarr
    environment:
      - SECRET_KEY=YOUR_SECRET_KEY
      - SECURE_COOKIES=false
    restart: unless-stopped
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| SECRET_KEY | Yes | (insecure) | JWT signing key. Generate with: `openssl rand -hex 32` |
| SECURE_COOKIES | Yes | false | false = HTTP (LAN), true = HTTPS (behind reverse proxy with SSL) |
| PORT | No | 8282 | Fastify listen port |
| DATA_DIR | No | /data | Database path and icon directory |
| LOG_LEVEL | No | info | debug · info · warn · error |
| LOG_FORMAT | No | pretty | pretty = human-readable output, json = structured for log aggregators |
| RECYCLARR_CONFIG_PATH | No | /recyclarr/recyclarr.yml | Path to the Recyclarr configuration file |
| RECYCLARR_CONTAINER_NAME | No | recyclarr | Name of the Recyclarr Docker container |

## First Start

1. Start the container
2. Open `http://server-ip:8282`
3. Create an admin account (prompted automatically on first start)
4. Under **Settings → General**: adjust the dashboard title
5. Under **Apps**: add your first services

## Unraid

Community Applications template available: `heldash.xml`

Import via **Community Applications → Import**

## Technical Details

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 5 |
| State | Zustand |
| Drag & Drop | @dnd-kit |
| Icons | lucide-react |
| Styling | Vanilla CSS, Glass Morphism |
| Backend | Fastify 4, TypeScript |
| Database | SQLite (WAL mode) |
| Container | Docker, node:20-alpine |
| Registry | ghcr.io/kreuzbube88/heldash |
