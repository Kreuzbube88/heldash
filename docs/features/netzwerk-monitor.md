# Netzwerk-Monitor

## Übersicht

Netzwerk-Geräte per TCP-Ping überwachen, Subnetze scannen und Geräte per Wake-on-LAN aufwecken — alles ohne externe Abhängigkeiten.

## Gerät hinzufügen

| Feld | Beschreibung |
|---|---|
| Name | Anzeigename des Geräts |
| IP-Adresse | IPv4-Adresse (z.B. 192.168.1.1) |
| Port | TCP-Port für Ping (leer = automatisch: 80, 443, 22, 8080) |
| MAC-Adresse | Optional — für Wake-on-LAN (Format: AA:BB:CC:DD:EE:FF) |
| Gruppe | Optional — zur Kategorisierung |

> Subnet wird manuell konfiguriert — nie automatisch erkannt (Docker-Container hat eigene IP)

## IP-Scanner

Subnetz im CIDR-Format scannen, erreichbare Geräte anzeigen und direkt hinzufügen.

### Verwendung

1. CIDR-Notation eingeben (z.B. `192.168.1.0/24`)
2. Scan starten — erreichbare Hosts werden aufgelistet
3. Gerät auswählen → direkt als Netzwerk-Gerät hinzufügen

> Max /22 (1024 Hosts) — größere Subnetze werden abgelehnt
> TCP-Ping auf Ports 80, 443, 22, 8080 in Reihenfolge

## Wake-on-LAN

Gerät per Magic Packet (UDP Broadcast, Port 9) aufwecken.

### Voraussetzungen

- BIOS/UEFI: Wake-on-LAN aktivieren
- Netzwerkkarte: WoL aktivieren (ethtool oder Treiber-Einstellung)
- MAC-Adresse des Geräts im Netzwerk-Gerät hinterlegen

> Magic Packet: 6×0xFF + 16× MAC-Bytes (102 Bytes gesamt)
> Kein WoL-Button wenn keine MAC-Adresse hinterlegt

## Aktivitäten & History

- Statuswechsel (online → offline / offline → online) erscheinen im Aktivitäten-Feed
- Filter "Netzwerk" im Logbuch → Tab "Aktivitäten"
- Pro Gerät: 24h Uptime-Verlauf als Miniaturgraph
- Status-History wird 7 Tage aufbewahrt
