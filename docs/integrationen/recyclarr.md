# Recyclarr & CF-Manager

## Recyclarr

### Voraussetzungen

- Recyclarr Docker-Container läuft
- CRON_SCHEDULE deaktiviert: `CRON_SCHEDULE=0 0 1 1 0`
- Volume-Mount in HELDASH-Container:

```
-v /pfad/zu/recyclarr/config:/recyclarr
```

Umgebungsvariablen in HELDASH setzen:

```
RECYCLARR_CONFIG_PATH=/recyclarr/recyclarr.yml
RECYCLARR_CONTAINER_NAME=recyclarr
```

### Recyclarr Container (falls nicht vorhanden)

```yaml
services:
  recyclarr:
    image: ghcr.io/recyclarr/recyclarr:latest
    container_name: recyclarr
    volumes:
      - /mnt/cache/appdata/recyclarr:/config
    environment:
      - TZ=Europe/Berlin
      - CRON_SCHEDULE=0 0 1 1 0
```

### Ersteinrichtung — Wizard

1. Media → Recyclarr-Tab → Wizard
2. Instanz wählen
3. Qualitätsprofile wählen (Standard/Deutsch/Anime)
4. "Nur deutsche Releases" Toggle (setzt min. Score 10000)
5. Eigene CFs zuweisen (vorher im CF-Manager erstellen)
6. Konfiguration erstellen → ersten Sync ausführen

> Score-Overrides und erweiterte Einstellungen nach erstem Sync im Recyclarr-Tab

### Profile verwalten

- Profil auswählen → TRaSH CFs mit Guide-Scores anzeigen
- Score-Override pro CF pro Profil (leer = Guide-Score)
- Eigene CFs pro Profil aktivieren + Score setzen
- Erweiterte Einstellungen: except, except_patterns (Regex), min_format_score, preferred_ratio, delete_old_custom_formats

### Schutz eigener Custom Formats

| Einstellung | Wert | Wo |
|---|---|---|
| Nicht mehr verwendete CFs löschen | AUS (Standard) | Erweiterte Einstellungen |
| User CFs aktivieren | Mit Score eintragen | Recyclarr-Tab → Profil |

> User CFs mit Score in trash_ids werden nie zurückgesetzt
> except-Liste nur für CFs komplett außerhalb Recyclarr's Kontrolle

### Sync-Zeitplan

Zeitplan-Tab: manuell, täglich, wöchentlich oder Cron-Ausdruck. Der Zeitplan wird sofort nach dem Speichern aktiv — kein Neustart des Containers erforderlich.

> CRON_SCHEDULE im Recyclarr-Container = `0 0 1 1 0` (deaktiviert)

### TRaSH Custom Format Groups

CFs werden automatisch nach Gruppen gefiltert und gruppiert:

- Nur Gruppen mit ≥50% Überschneidung zum konfigurierten Profil werden angezeigt
- Jede Gruppe ist ein-/ausklappbar
- Gruppen-Header zeigt: Name, CF-Anzahl, aktive Overrides, Sync-Toggle
- "Reset Group": alle Overrides dieser Gruppe zurücksetzen
- Suche filtert über alle Gruppen und klappt Treffer automatisch auf
- Eigene CFs (CF-Manager) werden separat angezeigt und im Profil zugewiesen

> CFs die keiner Gruppe angehören erscheinen unter "Nicht gruppiert"
> CFs die in Radarr/Sonarr sind aber nicht zum Profil gehören erscheinen unter "Nicht im Profil" (schreibgeschützt)

### Profil-Vergleich

Nur verfügbar wenn 2+ Profile für eine Instanz konfiguriert sind. "Profile vergleichen" Button → Vollbild-Overlay

- Alle Profile nebeneinander
- Gleiche Scores: grau (kein Unterschied)
- Unterschiedliche Scores: farblich hervorgehoben
- Toggle "Nur Unterschiede anzeigen" (Standard: an)
- Schreibgeschützt — Bearbeitung im normalen Tab

### Score-Heatmap

Toggle [Tabelle / Heatmap] pro Profil. Heatmap zeigt CFs als farbige Kacheln:

- **Grün** = hoher positiver Score
- **Rot** = hoher negativer Score
- **Grau** = 0
- Hover: vollständiger Name, Gruppe, Guide-Score vs. Override
- Klick: Score-Override direkt bearbeiten

### Sync-Verlauf & Backups

Sync läuft im Hintergrund — kein Stream während des Syncs. Nach Abschluss: kompakte Zusammenfassung ("3 CFs erstellt, 12 Scores aktualisiert").

- "Verlauf anzeigen": letzte 10 Syncs mit Timestamp, Ergebnis, Details auf Anfrage
- Automatisches Backup vor jedem Sync
- Max 5 Backups werden behalten
- Wiederherstellung per Klick unter "Backups" im Recyclarr-Tab

---

## CF-Manager

### Übersicht

Custom Formats direkt in Radarr und Sonarr verwalten — ohne die Oberfläche der Arr-Instanzen zu öffnen. Daten werden live aus der Instanz geladen.

### Instanz auswählen

Pill-Buttons oben — eine Schaltfläche pro Radarr/Sonarr-Instanz. Prowlarr, SABnzbd und Seerr werden nicht unterstützt.

### Custom Formats verwalten (linke Spalte)

Liste aller CFs die in der Instanz vorhanden sind. Suchfeld zum Filtern nach Name.

**Pro CF wird angezeigt:**

- Name
- Anzahl Conditions
- Score pro Qualitätsprofil (positiv / negativ)
- "Recyclarr: geschützt" wenn der CF-Name in der Recyclarr Ausnahmen-Liste (`reset_unmatched_scores.except`) steht

**Aktionen (nur Admins):**

- Stift-Icon → CF bearbeiten
- Papierkorb-Icon → CF löschen (mit Bestätigung)

**"+ Erstellen"** Button (nur Admins) → Neues CF anlegen

### CF erstellen / bearbeiten

**Felder:**

- Name (Pflicht)
- "Umbenennen wenn angewendet" Toggle

**Conditions:**

Pro Condition: Typ, Name, Negate, Pflicht, Wert. + Condition hinzufügen / × entfernen

**Unterstützte Typen:**

- Release-Titel (Regex)
- Sprache
- Quelle
- Auflösung
- Release-Gruppe
- Qualitäts-Modifier
- Dateigröße
- Indexer-Flag

> Änderungen werden direkt in Radarr/Sonarr gespeichert.

### Scores im Qualitätsprofil setzen (rechte Spalte)

Tabs — ein Tab pro Qualitätsprofil in der Instanz. Mehrere Profile pro Instanz werden vollständig unterstützt.

Pro Profil: Tabelle aller CFs mit aktuellem Score. Score-Eingabe pro CF — positiv, negativ oder 0. **"Alle Scores speichern"** speichert alle Änderungen auf einmal.

> Scores die von Recyclarr verwaltet werden können beim nächsten Sync überschrieben werden — außer der CF-Name steht in der Ausnahmen-Liste unter Recyclarr → Advanced Settings.
> "Recyclarr: geschützt" neben CFs die in der Ausnahmen-Liste stehen — diese Scores werden nicht überschrieben.

### Zusammenspiel mit Recyclarr

Empfohlener Workflow für eigene CFs (z.B. Tdarr):

1. CF hier im CF-Manager erstellen (Name + Conditions)
2. Score im gewünschten Qualitätsprofil setzen
3. In **Recyclarr → Instanz → Advanced Settings** des Profils: CF-Namen zur Ausnahmen-Liste hinzufügen
4. Recyclarr überschreibt diesen Score beim Sync nicht mehr

### Import, Export & Kopieren

**Import aus Radarr/Sonarr:**

"Importieren" Button → zeigt alle CFs die nicht von TRaSH verwaltet werden. Auswahl per Checkbox — nur ausgewählte werden übernommen. Bereits verwaltete CFs mit Unterschieden: "Lokal abweichend" Badge + Option zu sync.

> TRaSH-verwaltete CFs werden automatisch gefiltert und nicht angeboten

**Export:**

Pro CF-Zeile: Download-Icon → exportiert CF als JSON. Format kompatibel mit Radarr/Sonarr Export und TRaSH Guides.

**CF kopieren:**

- Pro CF-Zeile: Kopier-Icon → öffnet Kopier-Dialog
- Ziel: gleiche Instanz ODER andere Instanz (Radarr → Sonarr möglich)
- Neuer Name vorausgefüllt: "{Name} (Kopie)"
- CF wird direkt in Ziel-Instanz erstellt + JSON-Datei angelegt

### Condition-Vorlagen

Beim "+ Condition hinzufügen" → Auswahl: "Aus Vorlage" oder "Leer beginnen". Vorlagen gruppiert nach Typ:

- Release-Titel: Deutsch, x265, Netflix, Amazon, Disney+, Remux, IMAX, HDR, Atmos...
- Sprache: Deutsch, Englisch, Französisch, Japanisch, Multi
- Quelle: BluRay, WEB-DL, WEBRip, HDTV, DVD
- Auflösung: 480p, 720p, 1080p, 2160p
- Dateigröße: Klein (<2GB), Mittel (2–10GB), Groß (>30GB)
- Qualitäts-Modifier, Indexer-Flag, Edition: IMAX, Director's Cut, Extended
- Alle Felder nach Auswahl bearbeitbar
