# CookMapz — Databases, Services & Tools

Reference for the external services, databases, and libraries used in this project.

---

## Databases & Backend

### Supabase (PostgreSQL)

Primary backend. Hosts the app database, auth, file storage, and one edge function.

| Area | Details |
|------|---------|
| **Client** | `@supabase/supabase-js` via `lib/supabase.ts` |
| **Local dev** | Supabase CLI config in `supabase/config.toml` (Postgres 17) |
| **Types** | `types/database.ts` |

**Tables**

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (display name, handle, avatar, role) |
| `creator_posts` | Shorts, live streams, pickup location, donations |
| `post_plates` | Plates attached to a specific post |
| `creator_plates` | Reusable plate menu items for a chef |
| `post_plate_links` | Links creator plates to posts |
| `plate_orders` | Buyer orders for plates |
| `post_comments` | Comments on posts |

**Storage buckets**

| Bucket | Purpose |
|--------|---------|
| `avatars` | Profile photos |
| `creator-videos` | Uploaded video files |
| `plate-images` | Plate / food photos |

**Edge functions**

| Function | Purpose |
|----------|---------|
| `delete-account` | Deletes user data, Supabase storage, and Bunny videos |

**Env vars**

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (scripts / server-side only)

---

## Auth & Session Storage

| Platform | Storage | File |
|----------|---------|------|
| **iOS / Android** | [Expo Secure Store](https://docs.expo.dev/versions/latest/sdk/securestore/) — encrypted keychain / keystore (chunked for large Supabase sessions) | `lib/authStorage.ts` |
| **Web** | Browser `localStorage` | `lib/authStorage.web.ts` |

Supabase auth is configured with persistent sessions and auto token refresh in `lib/supabase.ts`.

---

## Maps & Location

| Tool | Platform | Purpose | Key files |
|------|----------|---------|-----------|
| **[Expo Maps](https://docs.expo.dev/versions/latest/sdk/maps/)** | iOS (Apple Maps), Android (Google Maps) | Native pickup map, chef pins, user location | `components/map/ExpoPickupMap.tsx`, `components/map/PickupMap.native.tsx` |
| **[Google Maps](https://developers.google.com/maps)** | Android (native SDK key in `app.config.ts`), Web (`@vis.gl/react-google-maps`) | Web map + Android native maps backend | `components/map/PickupMap.web.tsx`, `app.config.ts` |
| **[Expo Location](https://docs.expo.dev/versions/latest/sdk/location/)** | iOS / Android | GPS, permissions, live user position | `contexts/UserLocationContext.tsx`, `hooks/useUserLocation.ts` |
| **Google Places API** | All | Address / place search | `lib/googlePlaces.ts` |

**Env vars**

- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## Video & Live Streaming (Bunny.net)

| Service | Purpose | Key files |
|---------|---------|-----------|
| **Bunny Stream** | VOD upload, HLS playback, thumbnails for cooking shorts | `lib/bunnyStream.ts`, `lib/bunnyUpload.ts`, `lib/bunnyApi.ts` |
| **Bunny Live** | RTMP live streaming (`Go Live`) | `lib/bunnyLive.ts`, `screens/cook/GoLiveScreen.tsx` |

**Env vars**

- `EXPO_PUBLIC_BUNNY_STREAM_API_KEY`
- `EXPO_PUBLIC_BUNNY_STREAM_LIBRARY_ID`
- `EXPO_PUBLIC_BUNNY_STREAM_CDN_HOSTNAME`
- `EXPO_PUBLIC_BUNNY_STREAM_EMBED_REFERER`
- `EXPO_PUBLIC_BUNNY_LIVE_API_KEY`
- `EXPO_PUBLIC_BUNNY_LIVE_LIBRARY_ID`
- `EXPO_PUBLIC_BUNNY_LIVE_CDN_HOSTNAME`
- `EXPO_PUBLIC_BUNNY_LIVE_RTMP_URL`

---

## Expo SDK Modules

| Package | Used for |
|---------|----------|
| `expo` | Core Expo SDK (~54) |
| `expo-dev-client` | Custom dev builds (development profile only) |
| `expo-secure-store` | Encrypted auth session storage (native) |
| `expo-maps` | Native maps on iOS / Android |
| `expo-location` | Device location & permissions |
| `expo-video` | HLS / video playback in feed | `components/cook/FeedVideoPlayer.tsx` |
| `expo-image-picker` | Profile photos, plate images, go-live cover | Profile / plate / live screens |
| `expo-file-system` | Reading local files before Bunny upload | `lib/bunnyUpload.ts` |
| `expo-font` | Custom fonts |
| `expo-linear-gradient` | UI gradients | Login, live feed cards |
| `expo-splash-screen` | Splash screen control | `App.tsx` |
| `expo-status-bar` | Status bar styling | `App.tsx` |
| `expo-system-ui` | System UI / theme integration |
| `expo-constants` | App metadata / build info |

Configured plugins in `app.config.ts`: `expo-dev-client`, `expo-image-picker`, `expo-system-ui`, `expo-font`, `expo-video`, `expo-location`, `expo-maps`.

---

## Build, Deploy & Hosting

| Tool | Purpose | Config / scripts |
|------|---------|------------------|
| **[EAS Build](https://docs.expo.dev/build/introduction/)** | iOS / Android cloud builds | `eas.json` |
| **[EAS Submit](https://docs.expo.dev/submit/introduction/)** | App Store / Play Store submission | `eas.json` → `submit.production` |
| **[Cloudflare Workers](https://developers.cloudflare.com/workers/)** | Web app hosting (static SPA) | `wrangler.jsonc` |
| **Wrangler** | Deploy web build to Cloudflare | `npm run deploy:cloudflare` |

**EAS build profiles:** `development` (dev client APK), `preview` (internal APK), `production` (store AAB).

**EAS env sync:** `npm run sync:eas-env` pushes `EXPO_PUBLIC_*` vars from `.env` to EAS.

---

## UI & Frontend Libraries

| Library | Purpose |
|---------|---------|
| **React Native** | Mobile app framework |
| **React Native Web** | Web target |
| **NativeWind + Tailwind CSS** | Utility-first styling |
| **react-native-reanimated** | Animations |
| **react-native-safe-area-context** | Safe area insets |
| **@expo-google-fonts/dm-sans** | Body font |
| **@expo-google-fonts/syne** | Display font |
| **@expo/vector-icons** | Icons |
| **react-native-url-polyfill** | URL polyfill for Supabase on React Native |

---

## Dev & Tooling

| Tool | Purpose |
|------|---------|
| **TypeScript** | Type checking (`npm run typecheck`) |
| **patch-package** | Patches `expo-constants` (`patches/expo-constants+18.0.13.patch`) |
| **eas-cli** | EAS builds & env management |
| **Supabase CLI** | Local Supabase stack & migrations (`supabase/migrations/`) |
| **Node.js ≥ 22** | Required runtime |

---

## Scripts & Utilities

| Script | Purpose |
|--------|---------|
| `scripts/seed_demo_content.mjs` | Seed demo users, posts, and Bunny videos |
| `scripts/sync-eas-env.mjs` | Sync `.env` → EAS environment variables |
| `scripts/eas-sync-app-version.mjs` | Sync app version during EAS builds |
| `scripts/download_tiktok.py` | Dev utility — download TikTok videos via **yt-dlp** (+ optional **FFmpeg**) |

---

## Environment Variables (summary)

All public client vars use the `EXPO_PUBLIC_` prefix so Expo can embed them at build time.

| Variable | Service |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps / Places |
| `EXPO_PUBLIC_BUNNY_STREAM_*` | Bunny Stream |
| `EXPO_PUBLIC_BUNNY_LIVE_*` | Bunny Live |

Server-only (not bundled in the app):

| Variable | Service |
|----------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin (seed script, edge functions) |
| `EXPO_TOKEN` | EAS CLI auth |
| `COOKMAPZ_DEMO_EMAIL` / `COOKMAPZ_DEMO_PASSWORD` | Demo seed script |

See `env.d.ts` for the full typed list.

---

## Platform Map (quick reference)

```
┌─────────────────────────────────────────────────────────────┐
│                        CookMapz App                         │
├──────────────┬──────────────────────┬───────────────────────┤
│  iOS/Android │         Web          │      Cloud / CI       │
├──────────────┼──────────────────────┼───────────────────────┤
│ Expo Maps    │ @vis.gl/google-maps  │ EAS Build & Submit    │
│ Secure Store │ localStorage         │ Cloudflare (web SPA)  │
│ Expo Location│                      │ Supabase (hosted)     │
│ Expo Video   │                      │ Bunny CDN             │
└──────────────┴──────────────────────┴───────────────────────┘
                              │
                    Supabase (Postgres + Auth + Storage)
                    Bunny Stream / Live (video CDN)
                    Google Maps / Places (maps & geocoding)
```
