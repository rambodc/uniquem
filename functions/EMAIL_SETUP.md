# Inquiry email notifications

The `submitContactInquiry` callable validates the inquiry, saves it to Firestore (`contactInquiries`) first, and then sends a notification email through the [Resend](https://resend.com) HTTP API (`POST https://api.resend.com/emails`).

- From: `Uniquem Website <website@irobotx.io>` (the `irobotx.io` domain must stay verified in the Resend account that owns the API key)
- To: `rambodr@uniquem.ca`
- Subject: `New Uniquem website inquiry - <Mountain time>`, or `New Uniquem website inquiry (<product>) - <Mountain time>` for product inquiries, e.g. `New Uniquem website inquiry (SandWeb) - Oct 20, 2026, 1:48 PM MDT`. The timestamp keeps every subject unique.
- Reply-To: the visitor's email when provided; otherwise `rambodr@uniquem.ca` (SandWeb "Call me" leads have a phone number and no email).
- Body: one line per field (Product, Name, Email, Company, Phone, Submitted) followed by the visitor's message; SandWeb leads send a short message such as "Please call me about SandWeb."
- Idempotency key: `contact-inquiry/<Firestore inquiry id>`, so a retried send never duplicates.

Validation: `name` and `message` are required, and at least one of `email` or `phone` must be given. An email, when present, must be valid.

## Secret

The Resend API key is read from the Google Secret Manager secret `RESEND_API_KEY` (declared with `defineSecret` in `index.js`). Provision it for project `uniquem-4366e` before deploying Functions, for example:

```sh
npx -y firebase-tools@latest functions:secrets:set RESEND_API_KEY --project uniquem-4366e
```

Do not commit the value or place it in a GitHub secret, frontend environment variable, log, or chat message. The old `GMAIL_APP_PASSWORD` secret is no longer used and can be destroyed once the Resend version is live.

## Failure behaviour

If the secret is missing, Resend rejects the request (for example 403 for an unverified `from` domain), or the network fails, the inquiry remains saved in Firestore and the function returns success with `notificationSent: false`. The error message (never the key) is logged.

## User invites

The Users mini app (`createUser`, `sendUserInvite` in `users-functions.js`) emails new users a one-time Firebase password-setup link through the same Resend API, secret and `Uniquem Website <website@irobotx.io>` sender. The email goes only to the new user (Reply-To is the super admin who invited them) and is sent once per create, or when a super admin presses "Resend invite". The link is never logged or returned to the browser.
Both callables wait for Resend, retry transient failures twice with the same `Idempotency-Key` (`user-invite/{uid}/{random per invite}`), and save the outcome on `users/{uid}.invite`
(see `invite.js`); `listUsers` reads `GET /emails/{id}` to update delivered / delayed / bounced / complained.
