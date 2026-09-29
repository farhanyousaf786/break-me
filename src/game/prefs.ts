import { DEFAULT_SKINS, SKINS, type SkinChoice } from './skins'

const SKINS_KEY = 'breakme_skins'

const valid = (id: unknown): id is string => typeof id === 'string' && SKINS.some((s) => s.id === id)

export function loadSkins(): SkinChoice {
  try {
    const raw = JSON.parse(localStorage.getItem(SKINS_KEY) ?? '{}')
    return {
      blue: valid(raw.blue) ? raw.blue : DEFAULT_SKINS.blue,
      red: valid(raw.red) ? raw.red : DEFAULT_SKINS.red,
    }
  } catch {
    return { ...DEFAULT_SKINS }
  }
}

export function saveSkins(choice: SkinChoice) {
  try {
    localStorage.setItem(SKINS_KEY, JSON.stringify(choice))
  } catch {
    // Choice still applies for this session.
  }
}
