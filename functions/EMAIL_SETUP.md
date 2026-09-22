# Inquiry email notifications

The `submitContactInquiry` callable saves the inquiry to Firestore before attempting notification delivery. It reads the Gmail application password from the Google Secret Manager secret named `GMAIL_APP_PASSWORD`.

Provision the secret directly in Google Cloud Secret Manager for project `uniquem-4366e` before deploying Functions. Do not commit the value or place it in a GitHub secret, frontend environment variable, log, or chat message.

The runtime uses Gmail SMTP for `rambodc@irobotx.io` and sends notifications to the configured internal recipient. If the secret is absent or SMTP delivery fails, the inquiry remains saved in Firestore and the function returns success with `notificationSent: false`.
