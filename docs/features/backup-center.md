# Backup Center

## Übersicht

Zentrale Backup-Übersicht für alle Backup-Quellen im Homelab. Warnungen bei veralteten oder fehlgeschlagenen Backups.

| Quelle | Voraussetzung |
|---|---|
| CA Backup (Unraid) | /boot:/boot:ro Mount erforderlich |
| Duplicati | URL + API-Key |
| Kopia | URL + optionale Authentifizierung |
| Docker Config Export | Docker-Socket gemountet |
| Unraid VMs | Via CA Backup Log erkannt |

## CA Backup

CA Backup schreibt Logs nach `/boot/logs/`. HELDASH liest diese Logs um Backup-Status und Zeitpunkt zu ermitteln.

### Mount konfigurieren

```bash
# docker run:
-v /boot:/boot:ro

# docker-compose:
volumes:
  - /boot:/boot:ro
```

> Ohne /boot Mount: klare Fehlermeldung — kein Absturz

## Duplicati

Duplicati-Instanz per URL und API-Key anbinden.

| Feld | Beschreibung |
|---|---|
| URL | z.B. http://192.168.1.10:8200 |
| API-Key | Unter Duplicati → Einstellungen → API-Schlüssel |

> Timeout 5s — bei Nichterreichbarkeit: Fehler-State (kein Absturz)

## Kopia

Kopia Server per URL und optionaler HTTP-Authentifizierung anbinden.

| Feld | Beschreibung |
|---|---|
| URL | z.B. http://192.168.1.10:51515 |
| Benutzername | Optional (wenn Kopia-Auth aktiv) |
| Passwort | Optional |

## Docker Config Export

Alle laufenden Container-Konfigurationen als JSON exportieren.

- Exportiert: Container-Name, Image, Ports, Volumes, Umgebungsvariablen, Labels
- Format: JSON (application/json), direkt downloadbar
- Zum Importieren: `docker create` oder Compose-Datei manuell erstellen

> Nutzt bestehende Docker-Socket-Verbindung — kein zusätzlicher Mount erforderlich

## Warnungen & Aktivitäten

- Warnung wenn letztes Backup > 7 Tage alt
- Warnung bei fehlgeschlagenem Backup (Fehler-Status in Logs)
- Warnungen erscheinen in der Backup-Übersicht als hervorgehobene Karte
- Backup-Events im Logbuch → Tab "Aktivitäten" → Filter "Backup"

## Integrierter Leitfaden

Der Backup Center enthält einen integrierten Leitfaden: **Unraid vollständig sichern**. Themen: 3-2-1 Regel, CA Backup, Duplicati, Kopia, Datenbanken, Disaster Recovery. Erreichbar über den Tab "Leitfaden" im Backup Center.
