# Backup Center

## Overview

Central backup overview for all backup sources in your homelab. Warnings for outdated or failed backups.

| Source | Prerequisite |
|---|---|
| CA Backup (Unraid) | /boot:/boot:ro mount required |
| Duplicati | URL + API key |
| Kopia | URL + optional authentication |
| Docker Config Export | Docker socket mounted |
| Unraid VMs | Detected via CA Backup log |

## CA Backup

CA Backup writes logs to `/boot/logs/`. HELDASH reads these logs to determine backup status and timestamp.

### Configure the Mount

```bash
# docker run:
-v /boot:/boot:ro

# docker-compose:
volumes:
  - /boot:/boot:ro
```

> Without the /boot mount: a clear error message is shown — no crash

## Duplicati

Connect a Duplicati instance via URL and API key.

| Field | Description |
|---|---|
| URL | e.g. http://192.168.1.10:8200 |
| API Key | Under Duplicati → Settings → API Key |

> 5s timeout — if unreachable: error state (no crash)

## Kopia

Connect a Kopia server via URL and optional HTTP authentication.

| Field | Description |
|---|---|
| URL | e.g. http://192.168.1.10:51515 |
| Username | Optional (if Kopia auth is enabled) |
| Password | Optional |

## Docker Config Export

Export all running container configurations as JSON.

- Exported: container name, image, ports, volumes, environment variables, labels
- Format: JSON (application/json), directly downloadable
- To restore: use `docker create` or manually create a Compose file

> Uses the existing Docker socket connection — no additional mount required

## Warnings & Activities

- Warning if the last backup is > 7 days old
- Warning on failed backup (error status in logs)
- Warnings appear in the Backup Overview as highlighted cards
- Backup events in Logbook → Tab "Activities" → Filter "Backup"

## Built-in Guide

The Backup Center includes a built-in guide: **Backing Up Unraid Completely**. Topics: 3-2-1 rule, CA Backup, Duplicati, Kopia, databases, disaster recovery. Accessible via the "Guide" tab in the Backup Center.
