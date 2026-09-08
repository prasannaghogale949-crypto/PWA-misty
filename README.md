# Sahyadri Passport — MistyMonoliths

Mobile-first PWA MVP with two fully isolated flows: `/manager/*` (partner
store portal) and `/app/*` (trekker hub).

## Setup

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

Apply the schema to a fresh Supabase project:

```bash
psql "$DATABASE_URL" -f supabase/schema.sql
```

Then seed at least one `stores` row, one `managers` row (PIN hashed with
`crypt('1234', gen_salt('bf'))`), one `series` row (`forts-and-bastions-01`),
and a batch of `stamps` rows with real summit coordinates before testing the
scanners end to end.

## Directory structure

```
src/
  context/            ManagerAuthContext (PIN), UserAuthContext (phone OTP)
                       — isolated, no shared session or table
  routes/
    Landing.jsx
    manager/
      ManagerLogin.jsx       Quick-PIN sign-in
      ManagerShell.jsx       top-bar layout + tab nav
      RequireManager.jsx     route guard
      ManagerScanner.jsx     ★ full-screen QR activation (core deliverable)
      ManagerLedger.jsx      real-time commission dashboard
      ManagerResources.jsx   contract + 3-step scan guide
    user/
      UserAuth.jsx           phone OTP, prompted only after a scan
      UserShell.jsx          bottom-tab layout (thumb zone)
      UserScanner.jsx        ★ QR scan + AR fort-viewfinder summit
                              verification (core deliverable)
      UserVault.jsx          Series 01 collectible grid
      SocialExport.jsx       9:16 Instagram Story export
      Marketplace.jsx        Mohim Kit link
      Support.jsx            minimalist support form
  components/shared/
    StampCard.jsx            locked silhouette / unlocked foil card
supabase/
  schema.sql                 Users, Managers, Stamps, Transactions + RPCs
```

## Notes on the two core scanner components

- **ManagerScanner** uses `@zxing/browser` against the live camera stream,
  calls the `activate_stamp` RPC (idempotent — re-scans of an already-sold
  stamp don't double-credit commission), and shows a bottom-sheet result
  (success / duplicate / invalid) plus a manual-entry fallback for damaged
  codes.
- **UserScanner** is a two-step flow inside one camera session: scan the
  stamp's QR to identify the fort, then an AR viewfinder (SVG mask cutout
  shaped like a fort bastion) asks the trekker to align the real skyline
  while a live GPS watch checks distance to that fort's summit marker. Only
  within `SUMMIT_RADIUS_METERS` does "Confirm summit" call `verify_summit`
  and add the stamp to the Vault.

## What's stubbed for MVP speed

- PWA icons in `public/icons/` are placeholders — swap in real 192/512px art.
- `SocialExport` renders against sample stamp data rather than the routed
  `stampId`; wire it to `stamps`/`user_stamps` before shipping.
- Manager PIN hashing assumes Postgres `pgcrypto`'s `crypt()`; swap for a
  proper auth service if you need rate-limiting or lockouts.
