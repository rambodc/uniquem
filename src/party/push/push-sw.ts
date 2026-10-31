// Service worker for the party push test only (/party/push-test). Built on its own to dist/party-push-sw.js by vite.sw.config.ts
// and registered with the narrow scope /party/push-test, so it never controls or caches any other page of the site.
// Firebase Messaging shows the system notification when the page is hidden or closed, and hands the message to the open page otherwise.
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";
import { firebaseConfig } from "../../core/firebaseConfig";

type WorkerEvent = { waitUntil(work: Promise<unknown>): void };
declare const self: { skipWaiting(): Promise<void>; clients: { claim(): Promise<void> }; addEventListener(type: "install" | "activate", listener: (event: WorkerEvent) => void): void };
getMessaging(initializeApp(firebaseConfig));
self.addEventListener("install", () => { void self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(self.clients.claim()); });
