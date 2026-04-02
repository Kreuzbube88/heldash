# Unraid

## Übersicht

HELDASH verbindet sich direkt mit der nativen Unraid GraphQL API (Unraid 7.2+).
Kein Plugin erforderlich. Mehrere Server gleichzeitig verwaltbar.

## Verbindung einrichten

1. Unraid WebGUI → **Settings → Management Access → API Keys → "Create"**
2. Name vergeben (z.B. „HELDASH"), Rolle: **admin**, Key kopieren
3. In HELDASH: **Unraid-Seite → Server hinzufügen** → URL + API Key eingeben → Verbindung testen

> API-Key wird serverseitig gespeichert — nie an den Browser übertragen

## Unterstützte Funktionen

| Bereich | Funktionen |
|---|---|
| Übersicht | Hostname, OS, Uptime, CPU, RAM, Mainboard |
| HDD | Array start/stop, Parity Check, Disk-Tabelle mit Temp & Belegung, Cache Pools |
| Docker | Container starten, stoppen, neustarten, pausieren |
| VMs | Virtuelle Maschinen starten, stoppen, pausieren, fortsetzen |
| Freigaben | Größe, Belegung, Cache & LUKS-Status |
| Benachrichtigungen | Lesen, archivieren, Detail-Ansicht |
| System | Hardware, Versionen, Lizenz, Benutzer |

## Bekannte Einschränkungen

- Erfordert Unraid 7.2 oder neuer
- Disk Spin Up/Down: nicht von der Unraid API unterstützt
- VM-Details (CPU-Kerne, RAM): nicht über die API verfügbar
- Container-Icons und WebUI-Links: abhängig von der installierten API-Version
