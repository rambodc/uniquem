# Uniquem

Uniquem’s public website and private contact inbox. The site uses Vite/React, Firebase Hosting, Firebase Functions, Firestore, Storage rules, and Firebase Authentication.

## One-time Firebase setup

1. Enable Email/Password sign-in in Firebase Authentication.
2. Create the first super admin by hand (see "Users and mini apps" below): Auth user, verified email, and a `users/{uid}` record with `type: "super_admin"`.
3. Add the repository secrets below to the `Prod` GitHub environment.

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

After sign-in everyone lands on `/dashboard`, which shows one tile per mini app the account may open (today: Party, Contact form, Profile for everyone, and Users for super admins). Party lives at `/party`
(list, create/edit, guest list, `/party/:id/check-in` door screen).
All pages are private (`noindex`, no analytics, no screensaver) and every read/write goes through callable
functions in `functions/party-functions.js`; Firestore and Storage rules stay deny-all for browsers.

- Data: `parties/{partyId}` (name, startsAt, location, description, capacity, hostNotes, photoPath, thumbDataUrl, timestamps)
  and `parties/{partyId}/guests/{guestId}` (firstName, lastName, company, invitedBy ("Invited by / Type"), notes (optional, max 500), status `coming|pending|notComing`,
  plusOnes (0-10), vip, every field always written, checkedIn, checkedInAt, plusOnesArrived (0-10, reset by undo), searchKey, timestamps; walk-ins also have walkIn: true). Theme photos are stored in Storage under `party-photos/{partyId}/`
  and returned only to signed-in accounts with the Party mini app through `getPartyPhoto`.
- Bulk import (party page, "Import guests"): one guest per line, fields separated by commas or tabs (spreadsheet paste) in the
  order first name, last name, company, invited by / type, status, notes, plus-ones (0-10). Only the names are required (notes can only contain commas in a tab/spreadsheet paste); status is coming, pending or not coming
  (friendly variants like "yes" or "not-coming" work; blank means pending). A header row is ignored. Guests whose first + last
  name already exist on the party (any case) are never duplicated; their blank invited by / type, company, notes or plus-ones (0) is filled in, existing values never overwritten. VIP is not imported. Max 200 per `importGuests` call; the page sends longer lists in chunks.
- Door check-in (`/party/:id/check-in`, phones, tablets and laptops):
  - **Find** tab: search (name, company, group, notes, "vip"; Enter or ↓ jumps to the first result's Check in button, Esc and the big Clear button empty it) plus **browse all** (A–Z by first name, jump rail, group chips built from the guests' "Invited by / Type"). After a check-in from search the box clears and refocuses, and a 3-second toast offers Undo.
  - **Arrived** tab (side by side with Find on screens 1000px and wider): everyone checked in, latest first. Undo is two taps. Arrived guests are green everywhere and sort to the bottom of search results.
  - Every guest card is always shown in full (all labelled fields and the whole note) in search results, the browse list and the Arrived list. There is no expand/collapse.
  - **Plus-ones**: `plusOnes` is planned; at the door a stepper records `plusOnesArrived` (default = planned). Door header: people arrived = checked-in guests + plus-ones who arrived, versus expected = coming guests + their plus-ones.
  - **Counts (single source of truth)**: nothing is stored or incremented. `src/party/summary.ts` `summarize(guests, capacity)` derives every number (invited, coming, pending, not coming, checked in, arrived people, expected headcount, capacity left) from the guest list each time it is read; the party page and the door screen both call it and the server does not count at all (`listGuests` returns the party and its guests). A test fails if a screen counts on its own.
    **Capacity left = the party's own capacity − people who have arrived** (checked-in guests + their plus-ones who arrived, walk-ins included). It is negative ("Over by N") when over capacity and is not shown when the party has no capacity. "Expected headcount" (coming guests + their plus-ones) is a separate planning line and never affects capacity left.
    Capacity is only the value stored on the party (`parties/{id}.capacity`, set in the party form); there is no default in code.
  - Check-in fields always take one of two shapes (`notCheckedIn()` / `checkedInNow()` in `functions/party.js`): not checked in means `plusOnesArrived: 0` and no time; checked in means 0-10 plus-ones arrived. All writers (add, import, walk-in, check in, undo, door edit) use them, and a door edit cannot set plus-ones arrived on a guest who is not checked in (checked inside a transaction).
  - **Walk-in**: `addWalkIn` creates a "coming" guest (Invited by / Type defaults to "Walk-in") and checks them in in one call.
  - **Edit at the door**: `updateGuest` with `patch: true` can only change notes, status, VIP, plus-ones and (checked-in guests) plus-ones who arrived. Names and company are never changed from the door.
  - Check in, Undo and edits show at once and roll back with an error if the server call fails; the 10-second poll never overwrites a row that is mid-action. The door callables (`listGuests`, `checkInGuest`, `undoCheckIn`, `updateGuest`, `addWalkIn`) keep one warm instance (`minInstances: 1`).
- Times are entered and shown in Calgary time (America/Edmonton).

## Users and mini apps

The private workspace (sign-in, `/dashboard`) is made of **mini apps**. Who can sign in and what they can open comes only from Firestore,
one record per person: `users/{Firebase Auth uid}` =

| Field | Meaning |
| --- | --- |
| `email` | lowercase; must equal the signed-in account's (verified) email |
| `firstName`, `lastName` | required, 1 to 60 characters; set only by a super admin (the person can't change them) |
| `type` | `"super_admin"` or `"staff"` |
| `miniApps` | staff only: the ids of the *assignable* mini apps they may open. Always `[]` for a super admin (they get every mini app automatically, including ones added later) |
| `photoPath`, `thumbDataUrl` | the person's own profile photo: full 256px JPEG in Storage at `profile-photos/{uid}/`, 96px thumbnail kept here; both `null` without a photo. Set only by the person |
| `createdAt`, `createdBy`, `updatedAt`, `updatedBy` | who and when (emails) |

A missing record, a mismatched email, an unknown type or missing names means no access; nothing is guessed or defaulted. There is no hardcoded owner.

**Mini apps** are listed once, in `functions/miniApps.js` (`id`, `name`, `description`, `route`, `icon`, `accent`, `superAdminOnly`, `everyone`), which both the Cloud Functions and the
browser read. Current mini apps: `party` (Party), `contact` (Contact form), `users` (Users, `superAdminOnly`: staff can never be given it), `profile` (Profile, `everyone`: every user has it automatically; it is never assigned and never a checkbox in the Users screen). `accent` is the tile colour on the dashboard (green-led palette, no yellow). The dashboard tiles,
route guards (`<RequireMiniApp app="...">` in `src/App.tsx`), private-path lists (analytics, SEO, `?next=`) and server checks all come from that list.
The server checks every call: `requireMiniApp(request, "<id>")` for a mini app's callables and `requireSuperAdmin(request)` for the Users callables (`functions/core.js`);
the browser only hides screens. `getAccess` returns `{ type, miniApps, profile: { firstName, lastName, email, thumbDataUrl } }` for the signed-in account.

**Add a mini app:** (1) add one entry to `MINI_APPS` in `functions/miniApps.js`; (2) guard its callables with `requireMiniApp(request, "<id>")`;
(3) wrap its routes in `<RequireMiniApp app="<id>" />` in `src/App.tsx` and add `/<route>` and `/<route>/**` X-Robots-Tag noindex headers in `firebase.json`;
(4) add its icon to `ICONS` in `src/auth/miniApps.ts` if it is a new icon. The dashboard tile (icon, accent colour) comes from the registry entry. `npm test` and `npm test --prefix functions` fail if any step is missed.

**Users mini app** (`/users`, super admins only; `functions/users-functions.js`): list users (name, small avatar, email), add a user (first and last name, email, type, mini apps), edit names, email, type and mini apps,
resend an invite, and delete a user (with a confirm step; removes the `users/{uid}` record and the Firebase Auth account, so access ends on their next call).
- **Adding a user** creates the Firebase Auth account (random password nobody knows, email marked verified) and the `users/{uid}` record together, then emails the
  person an invite once through Resend (from `Uniquem Website <website@irobotx.io>`, same `RESEND_API_KEY` secret as the contact form). The email holds a one-time
  Firebase link where they choose their own password, then they sign in at `/signin`. The link works for about an hour; "Resend invite" sends a new one. The link is only ever
  in that email: it is not shown in the app and not logged. If the email fails, the user still exists and the screen says so.
- Super admins can edit or delete each other. They can fix their own name, but their own email, type and mini apps need another super admin, and nobody can delete themselves. The last super admin can never be demoted or deleted.
- **Changing an email** updates the Firebase Auth account first (it must stay unique; the record's email must equal the account's), then the record; if the record can't be saved the account is put back. The person's sessions are revoked, so they sign in again with the new email.
- **Super admins can't change a password or a profile photo**: no callable does it. The photo and the password belong to the person (see Profile). Deleting a user also deletes their photo.
- Staff can never be given the Users mini app: the server rejects `users` in a staff mini-app list, and every Users callable requires a super admin.

**Profile mini app** (`/profile`, everyone; `functions/profile-functions.js`): shows the person's first name, last name and email (read-only), their photo, and a change-password form.
- **Photo:** the browser centre-crops to a 256px JPEG plus a 96px JPEG thumbnail (the file may be JPEG, PNG or WebP up to 5 MB). `setMyPhoto` re-checks both on the server (real JPEG bytes, at most 200 KB and 16 KB), saves the full one in Storage under `profile-photos/{uid}/` and keeps the thumbnail on the record. `getMyPhoto` returns the person's own photo as a data URL; `removeMyPhoto` deletes it. These callables only ever act on the caller (they take no uid), Storage rules stay deny-all, and the photo never has a public URL.
- **Password:** done in the browser with Firebase Auth (`reauthenticateWithCredential` with the current password, then `updatePassword`; at least 8 characters). Passwords never touch our functions or logs.
- **Forgot password** on `/signin` calls Firebase's `sendPasswordResetEmail` (link returns to `https://uniquem.ca/signin`) and always shows the same neutral confirmation, whether or not the account exists.

**First super admin / recovery:** if every super admin is locked out, create the record by hand in the console: Firestore `users/{uid of the Auth account}` with
`email` (lowercase), `firstName`, `lastName`, `type: "super_admin"`, `miniApps: []`, `photoPath: null`, `thumbDataUrl: null` plus the four audit fields.
