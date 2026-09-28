# BreakMe (React Native)

Expo + Skia port of the web game in the parent folder. You vs CPU, 10 levels, recoil physics, shoot/break sounds.

## Run

Skia and expo-audio include native code, so the app needs a development build (Expo Go is not enough):

```bash
npm install
npx expo run:ios       # or: npx expo run:android
```

After the first native build, `npx expo start` is enough for day-to-day JS changes.

## Layout

- `src/game/engine.ts`, `levels.ts`, `types.ts`, `arena.ts` — game logic, copied from the web version
- `src/game/render.ts` — Skia drawing (port of the web canvas renderer)
- `src/game/sound.ts` — plays `assets/sfx/*.wav` with expo-audio
- `src/game/storage.ts` — unlocked-level progress in AsyncStorage
- `scripts/gen-sfx.mjs` — regenerates the WAV sound effects
