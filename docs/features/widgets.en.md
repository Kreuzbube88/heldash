# Widgets

## Available Widget Types

### Server Status

CPU, RAM, disk usage (Linux host)

**Setup:** Configure paths in the widget editor (name + path). Mount each disk as a volume: `-v /mnt/cache:/mnt/cache:ro`

> Unreachable paths are marked with a warning. Possible duplicates (same mount) are detected.

### AdGuard Home

DNS statistics, block rate, protection toggle

**Setup:** Enter URL + username + password

### Nginx Proxy Manager

Active proxies, certificates, expiry warnings

**Setup:** NPM URL + username + password (token authentication)

### Docker Overview

Container counts, Start/Stop/Restart

**Setup:** Docker socket must be mounted

> Enable Docker widget access per group

### Home Assistant

Entity states in Topbar/Sidebar

**Setup:** Select HA instance + entities

### HA Energy

Compact energy summary

**Setup:** Select HA instance + time period. Prerequisite: HA Energy Dashboard configured

### Calendar

Upcoming Radarr/Sonarr releases

**Setup:** Select Arr instances + days to preview (1–30)

## Widget Display Locations

| Location | Description |
|---|---|
| Dashboard | Full card in the widget area |
| Topbar | Compact stats in the top bar |
| Sidebar | Mini widget in the left navigation |

## Group Permissions for Widgets

**Settings → Groups → Group → Tab "Widgets"**
Show/hide individual widgets per group.
