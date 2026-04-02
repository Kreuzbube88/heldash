# Media & Arr

## Unterstützte Services

| Service | Typ | Funktion |
|---|---|---|
| Radarr | Arr | Film-Verwaltung, Queue, Kalender |
| Sonarr | Arr | Serien-Verwaltung, Queue, Kalender |
| Prowlarr | Arr | Indexer-Verwaltung |
| SABnzbd | Downloader | Download-Queue, Verlauf |
| Seerr | Request | Medien-Requests, Discover |

## Arr-Instanz hinzufügen

1. **Media-Seite → + Instance** (Topbar)
2. Typ wählen: Radarr / Sonarr / Prowlarr / SABnzbd / Seerr
3. URL und API-Key eintragen

> API-Keys werden serverseitig gespeichert — nie an den Browser übertragen

## Discover Tab (TMDB)

### Voraussetzungen

- Seerr-Instanz konfiguriert
- TMDB API-Key hinterlegt

### TMDB API-Key einrichten

1. Kostenlosen Account auf `themoviedb.org` erstellen
2. Unter `themoviedb.org/settings/api` → API-Key kopieren
3. In HELDASH: **Settings → General → TMDB API Key** eintragen

### Funktionen

- Trending-Inhalte browsen (Heute / Diese Woche)
- Filter: Genre, Streaming-Dienst, Sprache, Bewertung, Erscheinungsjahr
- Suche nach Filmen und Serien
- Request per Klick → wird direkt an Seerr gesendet
- TV-Serien: Staffelauswahl vor dem Request

## Icon-Vererbung

Media-Karten übernehmen automatisch das Icon des passenden Service-Eintrags (Abgleich über URL). Service in Apps mit gleicher URL → Icon wird übernommen.
