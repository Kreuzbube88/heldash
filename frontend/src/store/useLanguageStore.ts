import { create } from 'zustand'

type Language = 'de' | 'en'

interface LanguageStore {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useLanguageStore = create<LanguageStore>((set) => {
  const stored = localStorage.getItem('heldash_language') as Language | null
  const initial: Language = (stored && ['de', 'en'].includes(stored)) ? stored : 'de'
  return {
    language: initial,
    setLanguage: (language) => {
      set({ language })
      localStorage.setItem('heldash_language', language)
    },
  }
})
