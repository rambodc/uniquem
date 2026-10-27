# Uniquem

Uniquem’s public website and private contact inbox. The site uses Vite/React, Firebase Hosting, Firebase Functions, Firestore, Storage rules, and Firebase Authentication.

## One-time Firebase setup

1. Create `rambodr@uniquem.ca` as an Email/Password user in Firebase Authentication.
2. Mark the user’s email as verified.
3. Enable Email/Password sign-in in Firebase Authentication.
4. Add the repository secrets below to the `Prod` GitHub environment.

## GitHub Actions secrets

- `GCP_WIF_PROVIDER`
- `GCP_SERVICE_ACCOUNT_EMAIL`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Production deploys happen only from the `production` branch. Hosting, Functions, and Firebase rules are deployed by separate workflows; pull requests run checks only.

## Public page SEO

`npm run build` builds the browser app and renders all public routes from the same React components into static HTML. The temporary `.seo-build` server bundle is deleted after generation. Public metadata and sitemap routes are defined in `src/public/seo.ts`; client navigation uses the same metadata. The browser app hydrates the static HTML (keeping it, including the hero image) instead of rebuilding it. Unknown URLs get a branded `dist/404.html` (HTTP 404, noindex). Content images have 480/800/1200 px copies (`name-480w.webp` etc.) used through `src/public/img.ts`. The About page uses its existing image fallback during static rendering, then loads the animated scene in the browser.

Legacy PHP URLs are mapped to relevant current pages with permanent redirects in `firebase.json`. Keep these redirects for at least a year. Private routes have separate noindex HTML and `X-Robots-Tag` headers; robots.txt permits crawling so search engines can read those directives. Authentication still protects the inbox.

Build script changes trigger the existing production Hosting workflow. Before publishing, run `npm run lint`, `npm run build`, `npm test` and `npm run check:seo`. Use `npm run check:seo -- https://uniquem.ca` to verify the published site.

## Analytics (Google Analytics 4)

The GA4 measurement ID lives in `src/core/analyticsConfig.ts` (`GA_MEASUREMENT_ID_DEFAULT`, currently `G-1DLVMZX18M`; a `VITE_GA_MEASUREMENT_ID` build variable overrides it, and an empty value turns analytics off). gtag.js loads after the page has loaded and the browser is idle, only on `uniquem.ca` / `www.uniquem.ca`, and never on `/signin` or `/contact-inbox`. Page views are sent on every client-side route change. Custom events: `sandweb_presentation_start`, `sandweb_scene_view` (`scene_number`), `sandweb_presentation_complete`, `contact_option_select` (`option`), `lead_form_submit` (`form`, `method`, `product_name`). Parameters are whitelisted in `src/core/analytics.ts`; names, emails, phone numbers and messages are never sent.

## Search Console verification

The existing `google-site-verification` meta tag in `index.html` must stay. Extra HTML-tag codes can be added to `SEARCH_CONSOLE_VERIFICATION_CODES` in `src/core/analyticsConfig.ts`; for the HTML-file method, put Google's `googleXXXX.html` file in `public/`.

## Private workspace: dashboard and Party

After sign-in staff land on `/dashboard` (two cards: Contact Form, Party). Party lives at `/party`
(list, create/edit, guest list, `/party/:id/check-in` door screen, `/party/:id/summary`).
All pages are private (`noindex`, no analytics, no screensaver) and every read/write goes through callable
functions in `functions/party-functions.js`; Firestore and Storage rules stay deny-all for browsers.

- Data: `parties/{partyId}` (name, startsAt, location, description, capacity, hostNotes, photoPath, thumbDataUrl, timestamps)
  and `parties/{partyId}/guests/{guestId}` (firstName, lastName, company, invitedBy, status `coming|pending|notComing`,
  checkedIn, checkedInAt, searchKey, timestamps). Theme photos are stored in Storage under `party-photos/{partyId}/`
  and returned only to signed-in staff through `getPartyPhoto`.
- Access: the owner account (`ALLOWED_EMAIL` in `functions/core.js`) always has access, including the contact inbox.
  To add a staff member: create their Firebase Auth user (email verified), then add a Firestore document
  `staff/{their email in lowercase}` with `{ active: true }`. Staff get Party only; the contact inbox stays owner-only.
  Set `active: false` (or delete the document) to remove access.
- Bulk import (party page, "Import guests"): one guest per line, fields separated by commas or tabs (spreadsheet paste) in the
  order first name, last name, company, invited by, status. Only the names are required; status is coming, pending or not coming
  (friendly variants like "yes" or "not-coming" work; blank means pending). A header row is ignored. Guests whose first + last
  name already exist on the party (any case) are skipped. Max 200 per `importGuests` call; the page sends longer lists in chunks.
- Times are entered and shown in Calgary time (America/Edmonton).
- Local testing without touching production: run the Firebase emulators (auth, functions, firestore, storage) with a
  `demo-` project id and start the site with `VITE_USE_EMULATORS=true VITE_FIREBASE_PROJECT_ID=demo-uniquem npm run dev`.
