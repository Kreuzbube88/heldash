# Recyclarr & CF-Manager

## Recyclarr

### Prerequisites

- Recyclarr Docker container is running
- CRON_SCHEDULE disabled: `CRON_SCHEDULE=0 0 1 1 0`
- Volume mount in the HELDASH container:

```
-v /path/to/recyclarr/config:/recyclarr
```

Set environment variables in HELDASH:

```
RECYCLARR_CONFIG_PATH=/recyclarr/recyclarr.yml
RECYCLARR_CONTAINER_NAME=recyclarr
```

### Recyclarr Container (if not already set up)

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

### Initial Setup — Wizard

1. Media → Recyclarr tab → Wizard
2. Select an instance
3. Select quality profiles (Standard/German/Anime)
4. "German releases only" toggle (sets min. score 10000)
5. Assign custom CFs (create them in CF-Manager first)
6. Create configuration → run first sync

> Score overrides and advanced settings available after first sync in the Recyclarr tab

### Manage Profiles

- Select a profile → view TRaSH CFs with guide scores
- Score override per CF per profile (empty = guide score)
- Enable custom CFs per profile + set score
- Advanced settings: except, except_patterns (regex), min_format_score, preferred_ratio, delete_old_custom_formats

### Protecting Custom Formats

| Setting | Value | Where |
|---|---|---|
| Delete unused CFs | OFF (default) | Advanced Settings |
| Enable user CFs | Enter with score | Recyclarr tab → Profile |

> User CFs with scores in trash_ids are never reset
> Use the except list only for CFs completely outside Recyclarr's control

### Sync Schedule

Schedule tab: manual, daily, weekly, or custom cron expression. The schedule becomes active immediately after saving — no container restart required.

> CRON_SCHEDULE in the Recyclarr container = `0 0 1 1 0` (disabled)

### TRaSH Custom Format Groups

CFs are automatically filtered and grouped:

- Only groups with ≥50% overlap with the configured profile are shown
- Each group is collapsible
- Group header shows: name, CF count, active overrides, sync toggle
- "Reset Group": reset all overrides in this group
- Search filters across all groups and auto-expands matches
- Custom CFs (CF-Manager) are shown separately and assigned per profile

> CFs not belonging to any group appear under "Ungrouped"
> CFs present in Radarr/Sonarr but not in the profile appear under "Not in Profile" (read-only)

### Profile Comparison

Only available when 2+ profiles are configured for an instance. "Compare Profiles" button → full-screen overlay

- All profiles side by side
- Same scores: gray (no difference)
- Different scores: highlighted in color
- Toggle "Show differences only" (default: on)
- Read-only — editing done in the normal tab

### Score Heatmap

Toggle [Table / Heatmap] per profile. Heatmap shows CFs as colored tiles:

- **Green** = high positive score
- **Red** = high negative score
- **Gray** = 0
- Hover: full name, group, guide score vs. override
- Click: edit score override directly

### Sync History & Backups

Sync runs in the background — no stream during sync. After completion: compact summary ("3 CFs created, 12 scores updated").

- "Show History": last 10 syncs with timestamp, result, details on demand
- Automatic backup before each sync
- Max 5 backups retained
- Restore with one click under "Backups" in the Recyclarr tab

---

## CF-Manager

### Overview

Manage Custom Formats directly in Radarr and Sonarr — without opening the Arr instance interfaces. Data is loaded live from the instance.

### Select an Instance

Pill buttons at the top — one button per Radarr/Sonarr instance. Prowlarr, SABnzbd, and Seerr are not supported.

### Manage Custom Formats (left column)

List of all CFs present in the instance. Search field to filter by name.

**Per CF displayed:**

- Name
- Number of conditions
- Score per quality profile (positive / negative)
- "Recyclarr: protected" if the CF name is in the Recyclarr exceptions list (`reset_unmatched_scores.except`)

**Actions (admins only):**

- Pencil icon → edit CF
- Trash icon → delete CF (with confirmation)

**"+ Create"** button (admins only) → create a new CF

### Create / Edit a CF

**Fields:**

- Name (required)
- "Rename when applied" toggle

**Conditions:**

Per condition: type, name, negate, required, value. + Add condition / × remove condition

**Supported Types:**

- Release title (regex)
- Language
- Source
- Resolution
- Release group
- Quality modifier
- File size
- Indexer flag

> Changes are saved directly to Radarr/Sonarr.

### Set Scores in Quality Profiles (right column)

Tabs — one tab per quality profile in the instance. Multiple profiles per instance are fully supported.

Per profile: table of all CFs with current score. Score input per CF — positive, negative, or 0. **"Save All Scores"** saves all changes at once.

> Scores managed by Recyclarr may be overwritten on the next sync — unless the CF name is in the exceptions list under Recyclarr → Advanced Settings.
> "Recyclarr: protected" shown next to CFs in the exceptions list — these scores will not be overwritten.

### Working Together with Recyclarr

Recommended workflow for custom CFs (e.g. Tdarr):

1. Create the CF here in CF-Manager (name + conditions)
2. Set score in the desired quality profile
3. In **Recyclarr → Instance → Advanced Settings** of the profile: add the CF name to the exceptions list
4. Recyclarr will no longer overwrite this score on sync

### Import, Export & Copy

**Import from Radarr/Sonarr:**

"Import" button → shows all CFs not managed by TRaSH. Select via checkbox — only selected ones are imported. Already managed CFs with differences: "Locally modified" badge + option to sync.

> TRaSH-managed CFs are automatically filtered and not offered

**Export:**

Per CF row: download icon → exports CF as JSON. Format compatible with Radarr/Sonarr export and TRaSH Guides.

**Copy CF:**

- Per CF row: copy icon → opens copy dialog
- Target: same instance OR another instance (Radarr → Sonarr possible)
- New name pre-filled: "{Name} (Copy)"
- CF is created directly in the target instance + JSON file saved

### Condition Templates

When clicking "+ Add Condition" → choose: "From Template" or "Start Empty". Templates grouped by type:

- Release title: German, x265, Netflix, Amazon, Disney+, Remux, IMAX, HDR, Atmos...
- Language: German, English, French, Japanese, Multi
- Source: BluRay, WEB-DL, WEBRip, HDTV, DVD
- Resolution: 480p, 720p, 1080p, 2160p
- File size: Small (<2GB), Medium (2–10GB), Large (>30GB)
- Quality modifier, Indexer flag, Edition: IMAX, Director's Cut, Extended
- All fields editable after selection
