# Media & Arr

## Supported Services

| Service | Type | Function |
|---|---|---|
| Radarr | Arr | Movie management, queue, calendar |
| Sonarr | Arr | Series management, queue, calendar |
| Prowlarr | Arr | Indexer management |
| SABnzbd | Downloader | Download queue, history |
| Seerr | Request | Media requests, discover |

## Add an Arr Instance

1. **Media page → + Instance** (Topbar)
2. Select type: Radarr / Sonarr / Prowlarr / SABnzbd / Seerr
3. Enter URL and API key

> API keys are stored server-side — never transmitted to the browser

## Discover Tab (TMDB)

### Prerequisites

- Seerr instance configured
- TMDB API key set

### Set Up the TMDB API Key

1. Create a free account at `themoviedb.org`
2. Go to `themoviedb.org/settings/api` → copy your API key
3. In HELDASH: **Settings → General → TMDB API Key** → enter the key

### Features

- Browse trending content (Today / This Week)
- Filter by genre, streaming service, language, rating, release year
- Search for movies and series
- Request with one click → sent directly to Seerr
- TV series: season selection before requesting

## Icon Inheritance

Media cards automatically inherit the icon of the matching service entry (matched by URL). A service in Apps with the same URL → icon is inherited.
