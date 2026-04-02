import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import deCommon from './locales/de/common.json'
import enCommon from './locales/en/common.json'
import deSetup from './locales/de/setup.json'
import enSetup from './locales/en/setup.json'
import deSettings from './locales/de/settings.json'
import enSettings from './locales/en/settings.json'
import deDashboard from './locales/de/dashboard.json'
import enDashboard from './locales/en/dashboard.json'
import deHa from './locales/de/ha.json'
import enHa from './locales/en/ha.json'
import deDocker from './locales/de/docker.json'
import enDocker from './locales/en/docker.json'
import deBackup from './locales/de/backup.json'
import enBackup from './locales/en/backup.json'
import deNetwork from './locales/de/network.json'
import enNetwork from './locales/en/network.json'
import deLogbuch from './locales/de/logbuch.json'
import enLogbuch from './locales/en/logbuch.json'
import deAbout from './locales/de/about.json'
import enAbout from './locales/en/about.json'
import deBookmarks from './locales/de/bookmarks.json'
import enBookmarks from './locales/en/bookmarks.json'
import deMedia from './locales/de/media.json'
import enMedia from './locales/en/media.json'
import deServices from './locales/de/services.json'
import enServices from './locales/en/services.json'
import deWidgets from './locales/de/widgets.json'
import enWidgets from './locales/en/widgets.json'
import deInstances from './locales/de/instances.json'
import enInstances from './locales/en/instances.json'
import deUnraid from './locales/de/unraid.json'
import enUnraid from './locales/en/unraid.json'

const stored = localStorage.getItem('heldash_language')
const initialLang = stored === 'en' ? 'en' : 'de'

i18n
  .use(initReactI18next)
  .init({
    lng: initialLang,
    fallbackLng: 'de',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    resources: {
      de: {
        common: deCommon,
        setup: deSetup,
        settings: deSettings,
        dashboard: deDashboard,
        ha: deHa,
        docker: deDocker,
        backup: deBackup,
        network: deNetwork,
        logbuch: deLogbuch,
        about: deAbout,
        bookmarks: deBookmarks,
        media: deMedia,
        services: deServices,
        widgets: deWidgets,
        instances: deInstances,
        unraid: deUnraid,
      },
      en: {
        common: enCommon,
        setup: enSetup,
        settings: enSettings,
        dashboard: enDashboard,
        ha: enHa,
        docker: enDocker,
        backup: enBackup,
        network: enNetwork,
        logbuch: enLogbuch,
        about: enAbout,
        bookmarks: enBookmarks,
        media: enMedia,
        services: enServices,
        widgets: enWidgets,
        instances: enInstances,
        unraid: enUnraid,
      },
    },
  })

export default i18n
