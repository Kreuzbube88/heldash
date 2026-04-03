# Network Monitor

## Overview

Monitor network devices via TCP ping, scan subnets, and wake devices via Wake-on-LAN — all without external dependencies.

## Add a Device

| Field | Description |
|---|---|
| Name | Display name of the device |
| IP Address | IPv4 address (e.g. 192.168.1.1) |
| Port | TCP port for ping (empty = auto: 80, 443, 22, 8080) |
| MAC Address | Optional — for Wake-on-LAN (format: AA:BB:CC:DD:EE:FF) |
| Group | Optional — for categorization |

> Subnet is configured manually — never auto-detected (Docker container has its own IP)

## IP Scanner

Scan a subnet in CIDR format, display reachable devices, and add them directly.

### Usage

1. Enter CIDR notation (e.g. `192.168.1.0/24`)
2. Start scan — reachable hosts are listed
3. Select a device → add directly as a network device

> Max /22 (1024 hosts) — larger subnets are rejected
> TCP ping on ports 80, 443, 22, 8080 in sequence

## Wake-on-LAN

Wake a device via Magic Packet (UDP broadcast, port 9).

### Prerequisites

- BIOS/UEFI: enable Wake-on-LAN
- Network card: enable WoL (ethtool or driver setting)
- MAC address of the device stored in the network device entry

> Magic Packet: 6×0xFF + 16× MAC bytes (102 bytes total)
> No WoL button if no MAC address is stored

## Activities & History

- Status changes (online → offline / offline → online) appear in the activity feed
- Filter "Network" in Logbook → Tab "Activities"
- Per device: 24h uptime history as a mini graph
- Status history is retained for 7 days
