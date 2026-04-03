# 🚀 Version 1.4.0

> [🇬🇧 Scroll down for English version](#version-140-english)

## 🌐 Internationalisierung (i18n)

**Mehrsprachigkeit jetzt verfügbar!**
- 🇩🇪 **Deutsch** — Standard, vollständig verfügbar
- 🇬🇧 **Englisch** — vollständig verfügbar
- 🌍 **Weitere Sprachen** — einfach per Community-Contribution hinzufügbar

**Framework:** react-i18next
- ⚙️ Sprachwahl in Setup (erster Schritt, noch vor Admin-Account)
- ⚙️ Sprachwahl in Settings → General
- 💾 Spracheinstellung wird persistent gespeichert
- 📖 CONTRIBUTING.md mit detaillierter Anleitung für neue Sprachen

---

## 📖 Dokumentations-Umstrukturierung

**GitHub-basierte Dokumentation statt In-App**
- 📂 **Neuer /docs Ordner** — komplette Dokumentation als Markdown auf GitHub
- 🌍 **Bilingual** — Deutsch und Englisch parallel verfügbar
- 📄 **Strukturiert** — Installation, Integrationen, Features, Konfiguration
- 🔗 **AboutPage minimal** — von ~1500 auf 84 Zeilen reduziert, Link zu GitHub Docs
- ✅ **Wartbar** — Community kann Docs per PR verbessern

**Struktur:**
```
docs/
├── installation.md / installation.en.md
├── integrationen/ (docker, home-assistant, unraid, media-arr, recyclarr)
├── features/ (netzwerk-monitor, backup-center, widgets, bookmarks)
└── konfiguration/ (benutzer-gruppen, design-einstellungen)
```

---

## 🎨 Icon-Management System

**Zentrales Icon-System für alle Entities**
- ✨ **1800+ Icons** von dashboardicons.com direkt durchsuchbar
- 📤 **Custom Upload** — eigene Icons (PNG, JPG, SVG) hochladen
- 🔍 **Icon-Picker** — einheitlich für Services, Widgets, Bookmarks, Instanzen, Netzwerkgeräte
- 💾 **Icon-Caching** — Icons in Datenbank gespeichert, keine wiederholten CDN-Aufrufe
- 🔄 **Automatische Migration** — bestehende Icons (hochgeladen + Emojis) funktionieren weiterhin als Fallback

---

## 🔗 Zentrale Instanzen-Verwaltung

**Alle Instanzen an einem Ort**
- 📍 **Neue "Instanzen"-Seite** — Home Assistant, Radarr, Sonarr, Prowlarr, SABnzbd, Seerr, Unraid zentral verwalten
- 🎨 **Icon-Support** — jede Instanz kann individuelles Icon erhalten
- ⚡ **Auto-App-Erstellung** — beim Anlegen einer Instanz wird automatisch eine App im Services-Bereich erstellt (falls URL unique)
- 📊 **Instanz-Cards auf Widget-Seite** — alle Instanzen übersichtlich auf Widget-Seite angezeigt

**Vereinfachungen:**
- ❌ MediaPage: "Instances"-Tab entfernt
- ❌ Home Assistant: Instanzen-Verwaltung entfernt
- ❌ Unraid: Instanzen-Verwaltung entfernt
- ✅ Alle drei Seiten verlinken zur zentralen Instanzen-Seite

---

## 🏠 Home Assistant Erweiterungen

**GPS-Tab**
- 📍 Personen-Tracking auf OpenStreetMap
- 🗺️ Nur `person.*` Entities (keine doppelten Marker)
- 🔋 Batteriestatus-Anzeige
- ⏱️ Letzte Aktualisierung

**Automationen-Tab**
- 🤖 Automationen ausführen
- ⚡ Aktivieren/Deaktivieren
- 🔍 Suche

**Hausübersicht Landscape-Modus**
- 🖥️ Optimierte Darstellung im Querformat
- 📐 Bessere Nutzung des verfügbaren Platzes

---

## 💽 Unraid Integration Erweiterungen

**Plugins Tab**
- 🔌 Liste installierter Plugins
- 📦 Versionsanzeige
- ⬆️ Update-Status

**Logs Tab**
- 📜 System-Logs live streamen
- 🔍 Log-Level-Filter

**UPS Tab**
- ⚡ USV-Status
- 🔋 Batteriestand
- 📊 Last-Anzeige

---

## 🔖 Bookmarks-Seite

**Externe Links zentral verwalten**
- 📝 Neue dedizierte Seite für Bookmarks/Favoriten
- 🎨 Grid-Layout mit Icon-Support (dashboardicons.com + Custom Upload)
- 🔗 Klick öffnet Link direkt in neuem Tab
- 📌 "Show on Dashboard" Toggle pro Bookmark
- 📥 Import/Export als JSON

---

## 🌤️ Wetter-Widget

**Wettervorhersage direkt im Dashboard**
- 🌍 **Open-Meteo API** — keine Registrierung, kein API-Key erforderlich
- 📍 Standort via Koordinaten oder Stadtname konfigurierbar
- 🌡️ Anzeige: Temperatur, gefühlte Temperatur, Luftfeuchtigkeit, Niederschlag, Wind
- 🎨 Wetter-Icon basierend auf aktuellen Bedingungen
- 🔄 Automatische Aktualisierung alle 10 Minuten
- ⚙️ Direkt editierbar über Klick auf Widget

---

## 🌐 Netzwerk-Monitor Verbesserungen

**Optimierter Workflow beim IP-Scannen**
- ✅ Scan-Ergebnisse bleiben nach Hinzufügen von Geräten sichtbar
- 🔍 Bereits hinzugefügte Geräte visuell markiert (Checkmark + ausgegraut)
- ➕ Mehrere Geräte nacheinander hinzufügbar ohne erneuten Scan
- 🎯 "Scan abschließen" Button zum manuellen Schließen der Ergebnisse
- 🎨 Vollständige Icon-Auswahl für Netzwerkgeräte (ersetzt feste Emoji-Liste)

---

## 🔐 Login & Authentifizierung

**"Angemeldet bleiben" Option**
- ☑️ Optionale Checkbox beim Login
- 💾 Persistente Session über Browser-Neustarts hinweg
- 🔒 Weiterhin sicher (JWT httpOnly Cookies)

---

## 🎨 Design Consistency Pass

**UI-Vereinheitlichung über alle Seiten**
- 📐 Konsistente Sidebar-Gruppen-Separatoren
- 🗑️ Browser-Dialogs durch Toast/Confirmation-Komponenten ersetzt
- 🎯 Login Page und Docker Filter als Design-Referenz
- ✨ Inline-Expand-Pattern für Formulare (z.B. Unraid Instance Edit)

---

## 🐛 GitHub Issue Templates

**7 neue Issue Templates für besseres Community-Feedback**
- 🐛 Bug Report
- ✨ Feature Request
- 🌐 Translation Contribution
- 🔌 Integration Request
- ❓ Question / Support
- 📖 Documentation Issue
- ⚙️ Config (blank issue + links)

---

## 🔧 Fehlerbehebungen & Verbesserungen

- 🔗 URL-Uniqueness-Check verhindert doppelte App-Einträge bei automatischer Erstellung
- 🗄️ DB-Migration: `icon_id` Spalte zu `instances`-Tabelle hinzugefügt
- ♻️ Konsistentere UI durch zentrale Verwaltungsstrukturen
- 📦 Weniger Redundanz durch Zusammenführung von Instanzen-Verwaltung
- 🎨 Bessere visuelle Unterscheidung durch Icon-System
- 📝 README.md + README.en.md aktualisiert mit Docs-Links
- 🔄 CONTRIBUTING.md mit Übersetzungs- und Entwickler-Guidelines

---

## 🤝 Mitgewirkt

Dieses Release wurde vollständig mit Claude Code entwickelt.

**Besonderer Dank an:**
- Die Community für Feature-Vorschläge
- Zukünftige Übersetzer für weitere Sprachen

---

<a name="version-140-english"></a>
# 🚀 Version 1.4.0 (English)

> [🇩🇪 Nach oben scrollen für deutsche Version](#version-140)

## 🌐 Internationalization (i18n)

**Multi-language support now available!**
- 🇩🇪 **German** — default, fully available
- 🇬🇧 **English** — fully available
- 🌍 **More languages** — easily added via community contributions

**Framework:** react-i18next
- ⚙️ Language selection in Setup (first step, before admin account)
- ⚙️ Language selection in Settings → General
- 💾 Language preference persisted
- 📖 CONTRIBUTING.md with detailed guide for adding new languages

---

## 📖 Documentation Restructure

**GitHub-based documentation instead of in-app**
- 📂 **New /docs folder** — complete documentation as Markdown on GitHub
- 🌍 **Bilingual** — German and English in parallel
- 📄 **Structured** — Installation, Integrations, Features, Configuration
- 🔗 **AboutPage minimal** — reduced from ~1500 to 84 lines, links to GitHub docs
- ✅ **Maintainable** — community can improve docs via PR

**Structure:**
```
docs/
├── installation.md / installation.en.md
├── integrationen/ (docker, home-assistant, unraid, media-arr, recyclarr)
├── features/ (network-monitor, backup-center, widgets, bookmarks)
└── konfiguration/ (users-groups, design-settings)
```

---

## 🎨 Icon Management System

**Central icon system for all entities**
- ✨ **1800+ icons** from dashboardicons.com directly searchable
- 📤 **Custom upload** — upload your own icons (PNG, JPG, SVG)
- 🔍 **Icon picker** — unified for services, widgets, bookmarks, instances, network devices
- 💾 **Icon caching** — icons stored in database, no repeated CDN calls
- 🔄 **Automatic migration** — existing icons (uploaded + emojis) continue to work as fallback

---

## 🔗 Central Instance Management

**All instances in one place**
- 📍 **New "Instances" page** — manage Home Assistant, Radarr, Sonarr, Prowlarr, SABnzbd, Seerr, Unraid centrally
- 🎨 **Icon support** — each instance can have individual icon
- ⚡ **Auto-app creation** — creating an instance automatically creates an app in Services (if URL unique)
- 📊 **Instance cards on Widgets page** — all instances displayed clearly on Widgets page

**Simplifications:**
- ❌ MediaPage: "Instances" tab removed
- ❌ Home Assistant: instance management removed
- ❌ Unraid: instance management removed
- ✅ All three pages link to central Instances page

---

## 🏠 Home Assistant Extensions

**GPS Tab**
- 📍 Person tracking on OpenStreetMap
- 🗺️ Only `person.*` entities (no duplicate markers)
- 🔋 Battery status display
- ⏱️ Last update timestamp

**Automations Tab**
- 🤖 Execute automations
- ⚡ Enable/disable
- 🔍 Search

**Floor Plan Landscape Mode**
- 🖥️ Optimized display in landscape orientation
- 📐 Better use of available space

---

## 💽 Unraid Integration Extensions

**Plugins Tab**
- 🔌 List of installed plugins
- 📦 Version display
- ⬆️ Update status

**Logs Tab**
- 📜 Stream system logs live
- 🔍 Log level filter

**UPS Tab**
- ⚡ UPS status
- 🔋 Battery level
- 📊 Load display

---

## 🔖 Bookmarks Page

**Manage external links centrally**
- 📝 New dedicated page for bookmarks/favorites
- 🎨 Grid layout with icon support (dashboardicons.com + custom upload)
- 🔗 Click opens link directly in new tab
- 📌 "Show on Dashboard" toggle per bookmark
- 📥 Import/export as JSON

---

## 🌤️ Weather Widget

**Weather forecast directly in dashboard**
- 🌍 **Open-Meteo API** — no registration, no API key required
- 📍 Location via coordinates or city name
- 🌡️ Display: temperature, feels like, humidity, precipitation, wind
- 🎨 Weather icon based on current conditions
- 🔄 Automatic refresh every 10 minutes
- ⚙️ Directly editable via click on widget

---

## 🌐 Network Monitor Improvements

**Optimized workflow for IP scanning**
- ✅ Scan results remain visible after adding devices
- 🔍 Already added devices visually marked (checkmark + greyed out)
- ➕ Add multiple devices consecutively without re-scanning
- 🎯 "Finish scan" button to manually close results
- 🎨 Full icon selection for network devices (replaces fixed emoji list)

---

## 🔐 Login & Authentication

**"Remember me" option**
- ☑️ Optional checkbox at login
- 💾 Persistent session across browser restarts
- 🔒 Still secure (JWT httpOnly cookies)

---

## 🎨 Design Consistency Pass

**UI standardization across all pages**
- 📐 Consistent sidebar group separators
- 🗑️ Browser dialogs replaced with Toast/Confirmation components
- 🎯 Login Page and Docker filter as design reference
- ✨ Inline expand pattern for forms (e.g., Unraid instance edit)

---

## 🐛 GitHub Issue Templates

**7 new issue templates for better community feedback**
- 🐛 Bug Report
- ✨ Feature Request
- 🌐 Translation Contribution
- 🔌 Integration Request
- ❓ Question / Support
- 📖 Documentation Issue
- ⚙️ Config (blank issue + links)

---

## 🔧 Bugfixes & Improvements

- 🔗 URL uniqueness check prevents duplicate app entries during auto-creation
- 🗄️ DB migration: `icon_id` column added to `instances` table
- ♻️ More consistent UI through central management structures
- 📦 Less redundancy through instance management consolidation
- 🎨 Better visual distinction through icon system
- 📝 README.md + README.en.md updated with docs links
- 🔄 CONTRIBUTING.md with translation and developer guidelines

---

## 🤝 Contributors

This release was developed entirely with Claude Code.

**Special thanks to:**
- The community for feature suggestions
- Future translators for additional languages
