/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_SEARCH_CONSOLE_VERIFICATION?: string;
  readonly VITE_FIREBASE_VAPID_KEY?: string;
}
