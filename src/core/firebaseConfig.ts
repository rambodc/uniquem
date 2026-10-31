/** The web app's public Firebase config (shared by the site and the party push-test service worker). None of these values are secret. */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC-iuHRZWAzhCCq76fyFUnf4qvI0hK1C8w",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "uniquem-4366e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "uniquem-4366e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "uniquem-4366e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1023614587151",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1023614587151:web:76ea373e6e7408de1eee7a"
};
/** Public key of the project's Web Push certificate (Firebase console → Project settings → Cloud Messaging → Web Push certificates).
 * Public, not a secret. While empty, FCM uses Firebase's built-in default key, which also works. */
export const webPushVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";
