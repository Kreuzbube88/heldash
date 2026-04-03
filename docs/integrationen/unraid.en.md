# Unraid

## Overview

HELDASH connects directly to the native Unraid GraphQL API (Unraid 7.2+).
No plugin required. Multiple servers can be managed simultaneously.

## Set Up a Connection

1. Unraid WebGUI → **Settings → Management Access → API Keys → "Create"**
2. Enter a name (e.g. "HELDASH"), role: **admin**, copy the key
3. In HELDASH: **Unraid page → Add Server** → enter URL + API Key → test the connection

> API key is stored server-side — never transmitted to the browser

## Supported Features

| Section | Features |
|---|---|
| Overview | Hostname, OS, uptime, CPU, RAM, motherboard |
| HDD | Array start/stop, parity check, disk table with temperature & usage, cache pools |
| Docker | Start, stop, restart, pause containers |
| VMs | Start, stop, pause, resume virtual machines |
| Shares | Size, usage, cache & LUKS status |
| Notifications | Read, archive, detail view |
| System | Hardware, versions, license, users |

## Known Limitations

- Requires Unraid 7.2 or newer
- Disk spin up/down: not supported by the Unraid API
- VM details (CPU cores, RAM): not available via the API
- Container icons and WebUI links: depend on the installed API version
