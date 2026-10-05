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

`npm run build` builds the browser app and renders all public routes from the same React components into static HTML. The temporary `.seo-build` server bundle is deleted after generation. Public metadata and sitemap routes are defined in `src/public/seo.ts`; client navigation uses the same metadata. The interactive app mounts over the static HTML as before. The About page uses its existing image fallback during static rendering, then loads the animated scene in the browser.

Legacy PHP URLs are mapped to relevant current pages with permanent redirects in `firebase.json`. Keep these redirects for at least a year. Private routes have separate noindex HTML and `X-Robots-Tag` headers; robots.txt permits crawling so search engines can read those directives. Authentication still protects the inbox.

Build script changes trigger the existing production Hosting workflow. Before publishing, run `npm run lint`, `npm run build`, `npm test` and `npm run check:seo`. Use `npm run check:seo -- https://uniquem.ca` to verify the published site.
