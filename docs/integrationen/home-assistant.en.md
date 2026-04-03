# Home Assistant

## Add a HA Instance

1. **Home Assistant page → + Instance**
2. Enter name, URL (e.g. `http://homeassistant.local:8123`), and Long-Lived Token
3. Click **"Test"** to verify the connection

> Tokens are stored server-side — never transmitted to the browser

## Create a Long-Lived Token (in HA)

1. Open Home Assistant
2. **Profile → Security → Long-Lived Access Tokens → Create Token**
3. Copy the token and enter it in HELDASH

## Add Panels

1. Open the Entity Browser (magnifier icon)
2. Select a domain tab (Lights, Climate, Sensors, etc.)
3. Search for and select an entity → panel is added
4. Rearrange panels via drag & drop

## Rooms / Areas

Prerequisite: Areas must be configured in Home Assistant (**Settings → Areas & Zones → Areas**)

### Switch View

Toggle **"Flat"** | **"By Room"** — appears exclusively in the **"Panels"** tab. Preference is saved locally.

| View | Description |
|---|---|
| Flat | All panels in a single grid — previous behavior |
| By Room | Panels grouped by HA area. Each room as its own section with the room name. Panels without an area assignment appear under "No Room". Order: alphabetical, "No Room" always last. On mobile: rooms collapsible by tapping the header |

### Automatic Room Detection

When adding a panel, the room is automatically taken from the HA Entity Registry (if configured).

### Manually Assign a Room

Edit a panel (pencil icon) → **"Room"** dropdown. "No Room" = panel appears under "No Room".

> If no areas are configured in HA, the toggle is hidden and the flat view is used.

## Supported Entity Types

| Domain | Control |
|---|---|
| light.* | Toggle, brightness, color temperature |
| climate.* | Target temperature, HVAC mode |
| media_player.* | Play/Pause, volume, source, album art |
| cover.* | Open/Close, position |
| switch.*, automation.*, fan.* | Toggle |
| sensor.*, binary_sensor.* | Display (read-only) |
| script.*, scene.* | Run button |

## Energy Dashboard

### Prerequisites

The HA Energy Dashboard must be configured in Home Assistant.

### Add a Panel

1. **+ Panel → Panel Type: Energy**
2. Panel shows: grid consumption, solar, self-sufficiency, optional gas/feed-in
3. Select time period: Today / This Week / This Month

## HA Widget

**Settings → Widgets → + Widget → Type: Home Assistant**
Select entities for Topbar/Sidebar display.

## Floor Plan

Interactive floor/outdoor view with live state via WebSocket. Orientation is fixed to **Landscape**.

### Create a Floor Plan

1. Home Assistant → Tab "Floor Plan" → Add floor
2. Upload an image (PNG/JPG/SVG — floor plan drawing or photo)
3. Enable edit mode → place entities by clicking on the map
4. Entities show live state: lights pulse when on, sensors show their value

### Controls

- Zoom/Pan via CSS transform (no canvas element)
- Undo/Redo for entity placement
- Snap-to-grid optionally enabled
- Entity positions saved as % of canvas size (responsive)

> Images are stored in `{DATA_DIR}/floorplans/`, served via `/floorplan-images/`
> The first HA instance is used automatically — no instance selector

## Presence Tracking

Person entities (`person.*`) with status display: home / not_home / away.

- Presence bar shows all configured persons with status badge
- GPS map optional: enabled via toggle in localStorage
- Map: OpenStreetMap (Leaflet), loaded dynamically — no API key required
- GPS coordinates come from HA attributes (latitude/longitude)

> GPS map is opt-in — disabled by default (privacy)

## GPS Tab

Shows all persons (`person.*` entities) from Home Assistant as markers on a map.

- Click a marker to open a popup with device details
- A collapsible selection menu lets you show/hide individual persons

> Privacy-friendly: disabled by default — opt-in per user

## Automations Tab

Lists all automations configured in Home Assistant.

- Automations can be triggered directly from HELDASH
- Enable and disable individual automations via toggle
- Search field for quick filtering by name

## Lock & Alarm Cards

Secured controls for locks (`lock.*`) and alarm panels (`alarm_control_panel.*`).

- Lock cards: opening/closing requires PIN entry in a popover
- Alarm cards: arming/disarming with PIN confirmation
- PIN is passed directly to HA — not stored in HELDASH

> PIN protection is UI-side — run HELDASH on a local network only

## HA Alerts

Entity-based notifications as toast overlays.

### Create an Alert

1. Home Assistant → Tab "Alerts" → Add Alert
2. Select entity, condition (e.g. state = "on"), enter message
3. Alert fires when the entity reaches the defined state

> Rate limit: min 60s between two triggers per alert
> Max 20 alerts total
> Delivered via SSE stream `GET /api/ha/alerts/stream`

## Scenarios

Run HA scenes and scripts directly from HELDASH.

| Type | Description |
|---|---|
| Scene (scene.*) | Sets predefined device states — no feedback |
| Script (script.*) | Executes a sequence of actions — can have parameters |

> Scenarios tab: list of all scenes + scripts with a Run button

## Entity History

24h/7d graph for any entity. Data comes from the HA History API.

| Period | Resolution |
|---|---|
| 24 Hours | All data points |
| 7 Days | Hourly aggregation |

> Chart library: Recharts — available for all entity types (sensors, binary, climate, etc.)

## Activity Feed

HA events are automatically recorded in the logbook activity feed.

### Recorded Domains

light, switch, climate, cover, media_player, automation, scene, input_boolean

> Sensors (sensor.*, binary_sensor.*) are not recorded — too many updates
> Rate limit: max 1 entry per entity per 60 seconds

Display: Logbook → Tab "Activities" → Filter "HA"
