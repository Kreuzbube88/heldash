# Contributing to HELDASH

[🇬🇧 English](#english) | [🇩🇪 Deutsch](#deutsch)

---

<a name="english"></a>
## 🇬🇧 English

### Adding a Translation

HELDASH uses **react-i18next** for internationalization. Currently supported: German (default), English.

**To add your language:**

1. **Copy translation files:**
```bash
   cp -r frontend/src/locales/en frontend/src/locales/[your-lang]
   # Example: cp -r frontend/src/locales/en frontend/src/locales/fr
```

2. **Translate all 16 JSON files:**
   - `common.json` (navigation, buttons, status, toasts)
   - `setup.json`, `settings.json`, `dashboard.json`
   - `ha.json`, `docker.json`, `backup.json`, `network.json`
   - `unraid.json`, `logbuch.json`, `about.json`, `bookmarks.json`
   - `media.json`, `services.json`, `widgets.json`, `instances.json`

   **Keep untranslated:** Docker, Unraid, Home Assistant, technical terms, entity IDs

3. **Update code:**
   - Add imports to `frontend/src/i18n.ts`
   - Update type in `frontend/src/stores/useLanguageStore.ts`
   - Add option to `SetupPage.tsx` language selector
   - Add option to `Settings.tsx` language dropdown

4. **Test locally:**
```bash
   cd frontend && npm run dev
```

5. **Submit PR:**
   - Title: `feat: add [Language] translation`
   - Include language code, completion percentage
   - Mention any technical terms you kept in English

**Questions?** Open an issue with the "Add Translation" template.

---

### Code Contributions

**Tech Stack:**
- Frontend: React 18, TypeScript strict, Vite 5, Zustand
- Backend: Fastify 4, TypeScript strict, SQLite (better-sqlite3)
- Styling: Vanilla CSS (CSS custom properties only)

**Standards:**
- TypeScript strict — no `any` types
- All API calls via `api.ts` (never `fetch` in components)
- All state via Zustand stores
- CSS variables only (no inline styles except dynamic values)
- Icons: `lucide-react` only

**Setup:**
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

**Pull Requests:**
- One feature/fix per PR
- Run `tsc` in both `backend/` and `frontend/` before submitting
- Follow existing patterns (see `CLAUDE.md`)

---

<a name="deutsch"></a>
## 🇩🇪 Deutsch

### Übersetzung hinzufügen

HELDASH nutzt **react-i18next** für Internationalisierung. Aktuell verfügbar: Deutsch (Standard), Englisch.

**So fügst du deine Sprache hinzu:**

1. **Übersetzungsdateien kopieren:**
```bash
   cp -r frontend/src/locales/en frontend/src/locales/[deine-sprache]
   # Beispiel: cp -r frontend/src/locales/en frontend/src/locales/fr
```

2. **Alle 16 JSON-Dateien übersetzen:**
   - `common.json` (Navigation, Buttons, Status, Toasts)
   - `setup.json`, `settings.json`, `dashboard.json`
   - `ha.json`, `docker.json`, `backup.json`, `network.json`
   - `unraid.json`, `logbuch.json`, `about.json`, `bookmarks.json`
   - `media.json`, `services.json`, `widgets.json`, `instances.json`

   **Nicht übersetzen:** Docker, Unraid, Home Assistant, technische Begriffe, Entity-IDs

3. **Code aktualisieren:**
   - Imports in `frontend/src/i18n.ts` hinzufügen
   - Typ in `frontend/src/stores/useLanguageStore.ts` erweitern
   - Option in `SetupPage.tsx` Sprachauswahl hinzufügen
   - Option in `Settings.tsx` Dropdown hinzufügen

4. **Lokal testen:**
```bash
   cd frontend && npm run dev
```

5. **Pull Request erstellen:**
   - Titel: `feat: add [Sprache] translation`
   - Sprachcode und Vollständigkeit angeben
   - Technische Begriffe erwähnen die auf Englisch bleiben

**Fragen?** Issue mit "Add Translation" Template öffnen.

---

### Code Contributions

**Tech Stack:**
- Frontend: React 18, TypeScript strict, Vite 5, Zustand
- Backend: Fastify 4, TypeScript strict, SQLite (better-sqlite3)
- Styling: Vanilla CSS (nur CSS custom properties)

**Standards:**
- TypeScript strict — keine `any` Types
- Alle API-Calls über `api.ts` (nie `fetch` in Komponenten)
- Alle State-Änderungen über Zustand Stores
- Nur CSS-Variablen (keine Inline-Styles außer dynamische Werte)
- Icons: nur `lucide-react`

**Setup:**
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separates Terminal)
cd frontend && npm install && npm run dev
```

**Pull Requests:**
- Ein Feature/Fix pro PR
- `tsc` in `backend/` und `frontend/` vor Submit ausführen
- Bestehenden Patterns folgen (siehe `CLAUDE.md`)