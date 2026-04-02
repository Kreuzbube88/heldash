# Logbuch

## Übersicht

Das Logbuch ist das zentrale Monitoring-Center von HELDASH. Alle Aktivitäten, Service-Zustände, Sync-Verläufe und Docker-Events sind hier an einem Ort zusammengefasst.

## Homelab Health Score

Der Health Score (0–100) gibt einen schnellen Überblick über den Zustand des Homelabs. Er wird aus vier Bereichen berechnet:

| Bereich | Gewichtung | Kriterium |
|---|---|---|
| Services | 40 Punkte | Anteil online / gesamt |
| Docker | 30 Punkte | Anteil laufend / gesamt |
| Recyclarr | 20 Punkte | Letzter Sync erfolgreich |
| Home Assistant | 10 Punkte | Verbindung aktiv |

> Score wird bei jedem Seitenaufruf neu berechnet — kein Caching

## Ereignis-Kalender

Der Kalender zeigt die Aktivitätsdichte der letzten 84 Tage im GitHub-Contribution-Graph-Stil. Jede Zelle steht für einen Tag — dunklere Farbe = mehr Ereignisse.

- Datenbasis: `activity_log` Tabelle, nach Datum gruppiert
- Hover über eine Zelle zeigt Datum und Ereignis-Anzahl
- Standardmäßig eingeklappt — per Klick ausklappen

## Anomalie-Erkennung

Services mit auffälligem Verhalten werden automatisch markiert.

| Kriterium | Wert |
|---|---|
| Kategorie | system |
| Schwere | warning |
| Schwellwert | mehr als 3 Offline-Ereignisse in 24 Stunden |

> Anomalien erscheinen oben im Logbuch als hervorgehobene Karte

## Tabs

| Tab | Inhalt |
|---|---|
| Aktivitäten | Chronologischer Feed: HA Events, Docker Statuswechsel, Service-Ausfälle, Recyclarr Syncs |
| Uptime | Service-Verfügbarkeit: 7-Tage-Prozent, 24h-Graph pro Service |
| Sync-Verlauf | Letzte 10 Recyclarr-Syncs mit Timestamp, Ergebnis und Output auf Anfrage |
| Docker Events | Rohe Container-Ereignisse aus dem Docker Events stream |

## Filter

- **Kategorie**: Alle · HA · Docker · System · Recyclarr · Netzwerk · Backup
- **Zeitraum**: Letzte Stunde · 24h · 7 Tage · 30 Tage
- **Freitext**: Suche in Ereignis-Beschreibungen

## Ressourcen-Verlauf

CPU, RAM und Netzwerk-Auslastung als historischer Graph.

| Zeitraum | Auflösung | Aufbewahrung |
|---|---|---|
| 1 Stunde | 1-Minuten-Einträge | 25 Stunden |
| 24 Stunden | 1-Minuten-Einträge | 25 Stunden |
| 7 Tage | 15-Minuten-Aggregation | 8 Tage |

> Aggregation läuft alle 15min serverseitig — keine Lücken bei Browser-Reload

## Erweiterbarkeit

Das Logbuch ist modular aufgebaut. Neue Integrationen (z.B. Unraid API) werden als eigener Tab in das `TABS` Array in `LogbuchPage.tsx` eingetragen.
