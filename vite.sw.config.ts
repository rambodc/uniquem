import { defineConfig } from "vite";
// Builds the party push-test service worker (src/party/push/push-sw.ts) into one classic script at dist/party-push-sw.js.
export default defineConfig({
  publicDir: false,
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: { outDir: "dist", emptyOutDir: false, copyPublicDir: false, lib: { entry: "src/party/push/push-sw.ts", formats: ["iife"], name: "partyPushSw", fileName: () => "party-push-sw.js" } }
});
