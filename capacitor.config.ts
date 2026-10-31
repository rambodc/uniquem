import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS app (Capacitor). It ships the bundled website build in dist/ and never loads a remote URL.
// It opens on /dashboard (sign-in when signed out). See ios/README.md.
const config: CapacitorConfig = {
  appId: "ca.uniquem.app",
  appName: "Uniquem",
  webDir: "dist",
  server: { appStartPath: "dashboard" },
  ios: { contentInset: "always", backgroundColor: "#f3f7f5", scheme: "Uniquem" },
  plugins: {
    SplashScreen: { launchShowDuration: 600, launchAutoHide: true, backgroundColor: "#f3f7f5", showSpinner: false },
    StatusBar: { style: "LIGHT" },
    FirebaseMessaging: { presentationOptions: ["alert", "badge", "sound"] }
  },
  experimental: { ios: { spm: { packageOptions: { "@capacitor-firebase/messaging": { symlink: true }, "@capacitor-firebase/app-check": { symlink: true } } } } }
};
export default config;
