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
