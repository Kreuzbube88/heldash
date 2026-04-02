# Home Assistant

## HA-Instanz hinzufügen

1. **Home Assistant Seite → + Instance**
2. Name, URL (z.B. `http://homeassistant.local:8123`), Long-Lived Token eintragen
3. **"Test"** Button → Verbindung prüfen

> Tokens werden serverseitig gespeichert — nie an den Browser übertragen

## Long-Lived Token erstellen (in HA)

1. Home Assistant öffnen
2. **Profil → Sicherheit → Long-Lived Access Tokens → Token erstellen**
3. Token kopieren und in HELDASH eintragen

## Panels hinzufügen

1. Entity Browser öffnen (Lupe-Icon)
2. Domain-Tab wählen (Lichter, Klima, Sensoren, etc.)
3. Entity suchen und auswählen → Panel wird hinzugefügt
4. Panels per Drag & Drop anordnen

## Räume / Areas

Voraussetzung: Areas müssen in Home Assistant konfiguriert sein (**Einstellungen → Bereiche & Zonen → Bereiche**)

### Ansicht wechseln

Toggle **"Flach"** | **"Nach Raum"** — erscheint ausschließlich im Tab **"Panels"**. Preference wird lokal gespeichert.

| Ansicht | Beschreibung |
|---|---|
| Flach | Alle Panels in einem Grid — bisheriges Verhalten |
| Nach Raum | Panels werden nach HA-Bereich gruppiert. Jeder Raum als eigener Abschnitt mit Raumname. Panels ohne Raum-Zuweisung erscheinen unter "Ohne Raum". Reihenfolge: alphabetisch, "Ohne Raum" immer zuletzt. Auf Mobile: Räume kollabierbar per Tipp auf den Header |

### Raum automatisch erkennen

Beim Hinzufügen eines Panels wird der Raum automatisch aus der HA Entity-Registry übernommen (falls konfiguriert).

### Raum manuell zuweisen

Panel bearbeiten (Stift-Icon) → **"Raum"** Dropdown. "Kein Raum" = Panel erscheint in "Ohne Raum".

> Wenn keine Areas in HA konfiguriert sind, wird der Toggle ausgeblendet und die Flach-Ansicht verwendet.

## Unterstützte Entity-Typen

| Domain | Steuerung |
|---|---|
| light.* | Toggle, Helligkeit, Farbtemperatur |
| climate.* | Zieltemperatur, HVAC-Modus |
| media_player.* | Play/Pause, Lautstärke, Quelle, Album-Cover |
| cover.* | Öffnen/Schließen, Position |
| switch.*, automation.*, fan.* | Toggle |
| sensor.*, binary_sensor.* | Anzeige (schreibgeschützt) |
| script.*, scene.* | Ausführen-Button |

## Energy Dashboard

### Voraussetzungen

HA Energy Dashboard muss in Home Assistant konfiguriert sein.

### Panel hinzufügen

1. **+ Panel → Panel-Typ: Energy**
2. Panel zeigt: Netzverbrauch, Solar, Autarkie, optional Gas/Einspeisung
3. Zeitraum wählen: Heute / Diese Woche / Dieser Monat

## HA Widget

**Settings → Widgets → + Widget → Typ: Home Assistant**
Entities für Topbar/Sidebar-Anzeige auswählen.

## Hausübersicht

Interaktive Etagen-/Außenbereichsansicht mit Live-State via WebSocket. Die Ausrichtung ist fest auf **Landscape** gesetzt.

### Hausübersicht anlegen

1. Home Assistant → Tab "Hausübersicht" → Etage hinzufügen
2. Bild hochladen (PNG/JPG/SVG — Grundriss-Zeichnung oder Foto)
3. Edit-Modus aktivieren → Entities per Klick auf die Karte platzieren
4. Entities zeigen Live-State: Lichter pulsieren wenn an, Sensoren zeigen Wert

### Steuerung

- Zoom/Pan via CSS transform (kein Canvas-Element)
- Undo/Redo für Entity-Placement
- Snap-to-Grid optional aktivierbar
- Entity-Positionen werden als % der Canvas-Größe gespeichert (responsiv)

> Bilder werden in `{DATA_DIR}/floorplans/` gespeichert, via `/floorplan-images/` serviert
> Erste HA-Instanz wird automatisch verwendet — kein Instanz-Selektor

## Presence Tracking

Personen-Entities (`person.*`) mit Status-Anzeige: home / not_home / away.

- Presence Bar zeigt alle konfigurierten Personen mit Status-Badge
- GPS-Karte optional: per Toggle in localStorage aktivieren
- Karte: OpenStreetMap (Leaflet), dynamisch geladen — keine API-Key erforderlich
- GPS-Koordinaten kommen aus HA-Attributen (latitude/longitude)

> GPS-Karte ist opt-in — standardmäßig deaktiviert (Datenschutz)

## GPS-Tab

Zeigt alle Personen (`person.*`-Entities) aus Home Assistant als Marker auf einer Karte.

- Klick auf einen Marker öffnet ein Popup mit Gerätedetails
- Über ein einklappbares Auswahlmenü können einzelne Personen ein- oder ausgeblendet werden

> Datenschutzfreundlich: standardmäßig deaktiviert — opt-in pro Nutzer

## Automationen-Tab

Listet alle in Home Assistant konfigurierten Automationen.

- Automationen können direkt aus HELDASH heraus ausgeführt werden
- Aktivieren und Deaktivieren einzelner Automationen per Toggle möglich
- Suchfeld zum schnellen Filtern nach Name

## Lock & Alarm Karten

Gesicherte Bedienung für Schlösser (`lock.*`) und Alarmanlagen (`alarm_control_panel.*`).

- Lock-Karten: Öffnen/Schließen erfordert PIN-Eingabe im Popover
- Alarm-Karten: Scharf stellen / Deaktivieren mit PIN-Bestätigung
- PIN wird direkt an HA übergeben — nicht in HELDASH gespeichert

> PIN-Schutz ist UI-seitig — HELDASH nur im lokalen Netzwerk betreiben

## HA Alerts

Entity-basierte Benachrichtigungen als Toast-Overlay.

### Alert erstellen

1. Home Assistant → Tab "Alerts" → Alert hinzufügen
2. Entity auswählen, Bedingung (z.B. state = "on"), Nachricht eingeben
3. Alert wird ausgelöst wenn Entity den Zustand erreicht

> Rate-Limit: min 60s zwischen zwei Auslösungen pro Alert
> Max 20 Alerts gesamt
> Delivery via SSE stream `GET /api/ha/alerts/stream`

## Szenarien

HA Szenen und Scripts direkt aus HELDASH ausführen.

| Typ | Beschreibung |
|---|---|
| Szene (scene.*) | Setzt vordefinierte Gerätezustände — kein Feedback |
| Script (script.*) | Führt eine Abfolge von Aktionen aus — kann Parameter haben |

> Szenarien-Tab: Liste aller Szenen + Scripts mit Ausführen-Button

## Entity-Verlauf

24h/7T Graph für beliebige Entities. Daten kommen aus HA History API.

| Zeitraum | Auflösung |
|---|---|
| 24 Stunden | Alle Datenpunkte |
| 7 Tage | Stündliche Aggregation |

> Chart-Bibliothek: Recharts — verfügbar für alle Entity-Typen (Sensoren, Binär, Klima etc.)

## Aktivitäten-Feed

HA-Events werden automatisch im Logbuch-Aktivitäten-Feed erfasst.

### Erfasste Domains

light, switch, climate, cover, media_player, automation, scene, input_boolean

> Sensoren (sensor.*, binary_sensor.*) werden nicht erfasst — zu viele Updates
> Rate-Limit: max 1 Eintrag pro Entity pro 60 Sekunden

Anzeige: Logbuch → Tab "Aktivitäten" → Filter "HA"
