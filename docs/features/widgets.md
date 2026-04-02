# Widgets

## Verfügbare Widget-Typen

### Server Status

CPU, RAM, Festplatten-Auslastung (Linux-Host)

**Einrichtung:** Pfade im Widget-Editor konfigurieren (Name + Pfad). Jede Festplatte als Volume einbinden: `-v /mnt/cache:/mnt/cache:ro`

> Nicht erreichbare Pfade werden mit Warnung markiert. Mögliche Duplikate (gleicher Mount) werden erkannt.

### AdGuard Home

DNS-Statistiken, Blockierrate, Schutz-Toggle

**Einrichtung:** URL + Benutzername + Passwort eintragen

### Nginx Proxy Manager

Aktive Proxies, Zertifikate, Ablauf-Warnungen

**Einrichtung:** NPM-URL + Benutzername + Passwort (Token-Authentifizierung)

### Docker Overview

Container-Counts, Start/Stop/Restart

**Einrichtung:** Docker-Socket muss gemountet sein

> Docker Widget-Zugriff pro Gruppe aktivieren

### Home Assistant

Entity-States in Topbar/Sidebar

**Einrichtung:** HA-Instanz + Entities auswählen

### HA Energy

Kompakte Energie-Zusammenfassung

**Einrichtung:** HA-Instanz + Zeitraum auswählen. Voraussetzung: HA Energy Dashboard konfiguriert

### Kalender

Upcoming Radarr/Sonarr Releases

**Einrichtung:** Arr-Instanzen auswählen + Tage-Vorschau (1–30)

## Widget-Anzeigeorte

| Ort | Beschreibung |
|---|---|
| Dashboard | Vollständige Karte im Widget-Bereich |
| Topbar | Kompakte Stats in der oberen Leiste |
| Sidebar | Mini-Widget in der linken Navigation |

## Gruppen-Berechtigungen für Widgets

**Settings → Groups → Gruppe → Tab "Widgets"**
Einzelne Widgets für Gruppen ein-/ausblenden.
