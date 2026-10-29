import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'

/**
 * `@librechat/client` reads its strings through `useLocalize`, which expects the host to
 * have set up i18next. `en.json` holds exactly the keys the package references, with the
 * English values from LibreChat's translation files.
 */
void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: { en: { translation: en } },
  interpolation: { escapeValue: false },
})

export default i18n
