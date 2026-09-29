# Break Buddies – Recoil Duel (React Native)

Expo + Skia port of the web game in the parent folder. You vs CPU (10 levels) and online 1v1, recoil physics, 18 characters, shoot/break sounds.

## Run

Skia and expo-audio include native code, so the app needs a development build (Expo Go is not enough):

```bash
npm install
npx expo run:ios       # or: npx expo run:android
```

After the first native build, `npx expo start` is enough for day-to-day JS changes.

## Online multiplayer (Firebase)

Quick Match pairs you with a random online player; Create Room gives a 5-letter code to share with a friend, who enters it under Join. Matches are first to 3 rounds on random arenas.

Setup (free Spark plan is enough):

1. [Firebase console](https://console.firebase.google.com) → Add project.
2. Build → Authentication → Get started → enable **Anonymous**.
3. Build → Realtime Database → Create database (any region, start in locked mode), then Rules → paste `database.rules.json` → Publish.
4. Project settings → Your apps → add a **Web** app → copy the config values into `mobile/.env.local` (template: `.env.example`).
5. Restart Metro with `npx expo start --clear` so the env values are picked up.

### Guest or Google sign-in

Players choose **Play as Guest** (anonymous account) or **Sign in with Google**. A guest can upgrade to Google later from the Online screen; the same account is kept. Sign-in survives app restarts.

Guest play works with the steps above. To enable Google:

1. Authentication → Sign-in method → enable **Google**.
2. Project settings → add an **Android** app with package `com.breakbuddies.ushnfay`, and add your debug SHA-1 (`cd android && ./gradlew signingReport`, or `keytool -list -v -keystore ~/.android/debug.keystore -storepass android`). Download `google-services.json` into `mobile/`.
3. Add an **iOS** app with bundle id `com.breakbuddies.ushnfay` and download `GoogleService-Info.plist` into `mobile/`.
4. Authentication → Sign-in method → Google → Web SDK configuration → copy the **Web client ID** into `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env.local`.
5. Rebuild natively (`npx expo run:android --device` / `npx expo run:ios`). Google sign-in is a native module, and the Firebase files are only picked up by `app.config.js` at build time.

Both Firebase files are git-ignored.

How it works: the room creator (host, blue) runs the physics and publishes a compact snapshot about 15 times a second; the guest (red) sends taps and renders the snapshots with smoothing. Leaving or losing connection mid-match counts as a forfeit.

## Layout

- `src/game/engine.ts`, `levels.ts`, `types.ts`, `arena.ts` — game logic, copied from the web version
- `src/game/character.ts`, `skins.ts` — every character, drawn through a small painter interface (shared with web)
- `src/game/render.ts` — Skia drawing
- `src/game/ui.tsx` — buttons, icons, panels, background
- `src/net/` — Firebase setup, rooms/matchmaking, snapshot sync
- `src/game/sound.ts` — plays `assets/sfx/*.wav` with expo-audio
- `src/game/storage.ts` — progress and chosen characters in AsyncStorage
- `scripts/gen-sfx.mjs` — regenerates the WAV sound effects
