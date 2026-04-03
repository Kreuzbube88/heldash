# Docker

## Prerequisites

The Docker socket must be mounted into the container:

```
-v /var/run/docker.sock:/var/run/docker.sock:ro
```

## Enable the Docker Page

1. **Settings → Groups** → select a group
2. Tab **"Docker"** → enable Docker page access

> Admins always have access

## Features

- Container list with CPU/RAM usage
- Real-time status updates via Docker Events stream — no polling
- Live log stream per container (stdout + stderr)
- Start / Stop / Restart (admins only)
- Docker Overview Widget for Dashboard/Topbar/Sidebar

> Status changes (start/stop/restart) are automatically recorded in the activity feed

## Docker Overview Widget

1. **Widgets → + Add Widget → Type: Docker Overview**
2. Place the widget on the Dashboard, Topbar, or Sidebar

> Docker widget access must be enabled per group separately (Settings → Groups → Docker)
