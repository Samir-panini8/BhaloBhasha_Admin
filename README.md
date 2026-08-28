# ভালো ভাষা Admin

React Native + Expo admin app for ভালো ভাষা (Bhalo Bhasha). One app, two personas:

- **প্ল্যাটফর্ম অ্যাডমিন (Platform Admin)** — site-wide moderation, reports, stall verification/applications, user management.
- **স্টল অ্যাডমিন (Stall Admin)** — a সেলার/publisher/artisan/artist stall's own dashboard, catalog, and revenue.

A user with both kinds of access picks one at login via a persona switcher and can flip between them later from the "আরও" tab, without signing out.

## Requirements

- The backend at `C:\Users\admin\Desktop\BhaloBhasha\bhalo-bhasha` running and reachable from your device/emulator (see [Backend changes](#backend-changes-made-for-this-app) below — this app will not authenticate against an unmodified copy of that repo).
- Node 18+, and the Expo Go app (or a simulator) to run it.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` — `EXPO_PUBLIC_API_BASE_URL` must point at the backend from a place your phone/emulator can actually reach (`localhost` only works from an iOS simulator on the same machine). See the comments in `.env.example`.

```bash
npm start
```

Scan the QR code with Expo Go, or press `i`/`a` for a simulator/emulator.

## Architecture

- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (file-based, in `app/`). Two route groups, `(platform-admin)` and `(stall-admin)`, each a `Tabs` navigator gated by the active persona; `app/index.tsx` is the redirect gate that sends a signed-out user to `/login`, a signed-in-but-undecided user to `/persona-switcher`, and everyone else into their group.
- **Auth**: `lib/auth-context.tsx` (`AuthProvider`/`useAuth`) owns session state. Tokens live in `expo-secure-store` (Keychain/Keystore) — see `lib/storage.ts`.
- **API client**: `lib/api.ts` — a thin `fetch` wrapper that attaches the bearer token and `x-active-org` header, and transparently refreshes an expired access token once before failing.
- **Theme**: `lib/theme.ts` mirrors the web app's design tokens (see its `CLAUDE.md`) — navy/parchment palette, Noto Sans/Serif Bengali fonts loaded in `app/_layout.tsx`.

## Backend changes made for this app

The bhalo-bhasha backend originally authenticated **only** via httpOnly cookies, which a native app can't rely on the way a browser does. Three small, additive changes make it also serve bearer-token clients — the existing cookie-based web flow is untouched:

1. **`src/lib/auth.ts`** — `getSession()` now also checks `Authorization: Bearer <token>` when no cookie is present.
2. **`src/lib/org-roles.ts`** — the multi-stall "active org" switcher now also accepts an `x-active-org` header alongside the existing cookie (same "hint, not authority" validation).
3. **`src/app/api/auth/verify-otp/route.ts`** and **`src/app/api/auth/refresh/route.ts`** — when the request carries `x-client-platform: mobile`, the token pair is also returned in the JSON body (cookies are still set too, harmlessly, for a client that happens to have a cookie jar).
4. **`src/app/api/admin/organizations/route.ts`, `.../[id]/route.ts`, `.../[id]/verify/route.ts`** — swapped `requireSession()` (which redirects to `/login` on an expired session — fine for a browser, a broken response for `fetch`) for the `getSession()` + JSON `401` pattern every other admin route already uses.

## Known limitations / good next steps

- **Multi-stall dashboards**: `/api/publisher/dashboard` and a few other publisher routes resolve "your org" by grabbing the user's first `OrganizationMember` row rather than going through the switcher-aware `getOrgMembership()` helper. For an owner of more than one stall, switching personas via this app's switcher won't change what those specific screens show — a pre-existing behavior in the web app too, not something introduced here.
- **Revenue** (`/api/publisher/revenue`) only works for stalls that have a legacy `Publisher` record; a stall created fresh through the সোনাঝুরি/রঙ্গ application flow (Organization-only, no legacy row) gets a friendly empty state instead of numbers, until that endpoint is migrated to Organization V2.
- **Team management** (adding/removing stall members) isn't in this app yet — the relevant backend route (`/api/publisher/organization/members`) still uses the redirect-based `requireSession()` pattern, same issue as #4 above, not yet fixed.
- Screens cover the day-to-day queues (moderation, reports, stall applications/verification, users; catalog stock, revenue) rather than every admin surface the web app has (SEO, genres, authors, coupons, events, etc.) — same patterns (`lib/use-api-query.ts`, `components/`) extend cleanly to more screens as needed.
