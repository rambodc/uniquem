// Why the push test can or can't run on this device, in plain words with the exact steps to fix it.
export type Device = { ios: boolean; iosSafari: boolean; android: boolean; standalone: boolean; iosVersion: number | null };
export type Apis = { serviceWorker: boolean; pushManager: boolean; notification: boolean; indexedDb: boolean; secure: boolean };
export type Help = { tone: "info" | "warn" | "error"; title: string; steps: string[] };

export function readDevice(ua: string, platform: string, touchPoints: number, standalone: boolean): Device {
  const ipad = platform === "MacIntel" && touchPoints > 1;
  const ios = /iPhone|iPad|iPod/.test(ua) || ipad;
  const version = /OS (\d+)_(\d+)/.exec(ua);
  return { ios, iosSafari: ios && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|FBAN|FBAV|Instagram/.test(ua), android: /Android/.test(ua), standalone, iosVersion: version ? Number(version[1]) + Number(version[2]) / 100 : null };
}
export const missingApis = (apis: Apis) => [!apis.secure && "secure connection (https)", !apis.serviceWorker && "service workers", !apis.pushManager && "Push API", !apis.notification && "Notifications API", !apis.indexedDb && "IndexedDB"].filter(Boolean) as string[];

const IPHONE_STEPS = ["Open uniquem.ca/party/push-test in Safari.", "Tap the Share button (the square with the arrow), then Add to Home Screen, then Add.", "Close Safari and open “Uniq Party” from the new Home Screen icon.", "Tap Enable notifications, then Allow."];
const ANDROID_BLOCKED = ["Tap the icon left of the address bar (the lock or settings icon), then Permissions or Site settings.", "Set Notifications to Allow, then reload this page.", "Also check Android Settings → Apps → Chrome → Notifications is on."];
const DESKTOP_BLOCKED = ["Click the icon left of the address bar (lock or tune icon) and set Notifications to Allow.", "Reload this page.", "On a Mac, also allow the browser in System Settings → Notifications."];

/** What to show above the buttons, or null when everything is ready. */
export function pushHelp(device: Device, supported: boolean | null, missing: string[], permission: string, hasToken: boolean, error: string): Help | null {
  if (supported === null) return { tone: "info", title: "Checking this browser…", steps: [] };
  if (!supported) {
    if (device.ios && device.iosVersion !== null && device.iosVersion < 16.4) return { tone: "warn", title: `This iPhone runs iOS ${Math.floor(device.iosVersion)}. Web notifications need iOS 16.4 or later.`, steps: ["Update in Settings → General → Software Update, then follow the Home Screen steps below.", ...IPHONE_STEPS] };
    if (device.ios && !device.standalone) return { tone: "warn", title: "On iPhone and iPad, notifications only work from the Home Screen icon, not inside Safari or Chrome. That's why the buttons are off.", steps: device.iosSafari ? IPHONE_STEPS : ["Open this page in Safari instead (copy the link, paste it in Safari).", ...IPHONE_STEPS.slice(1)] };
    if (device.ios) return { tone: "error", title: "This Home Screen app can't get notifications.", steps: ["Make sure the iPhone is on iOS 16.4 or later (Settings → General → About).", "Delete the icon, then add it again from Safari: Share → Add to Home Screen.", `Missing in this browser: ${missing.join(", ") || "Push support"}.`] };
    if (device.android) return { tone: "warn", title: "This Android browser doesn't support web notifications.", steps: ["Open uniquem.ca/party/push-test in Google Chrome (not an in-app browser like Instagram or Gmail's viewer).", "Tap Enable notifications, then Allow.", `Missing here: ${missing.join(", ") || "Push support"}.`] };
    return { tone: "warn", title: "This browser doesn't support web notifications.", steps: ["Use the latest Chrome, Edge, Firefox or Safari, outside private or incognito mode.", `Missing here: ${missing.join(", ") || "Push support"}.`] };
  }
  if (permission === "denied") return { tone: "error", title: "Notifications are blocked for this site, so the browser won't ask again.", steps: device.ios ? ["Open iPhone Settings → Notifications → Uniq Party and turn on Allow Notifications.", "Reopen the app from the Home Screen icon."] : device.android ? ANDROID_BLOCKED : DESKTOP_BLOCKED };
  if (error) return { tone: "error", title: "Something went wrong", steps: [error, "Tap Enable notifications to try again. If it keeps failing, reload the page."] };
  if (permission !== "granted") return { tone: "info", title: "Step 1: tap Enable notifications and choose Allow.", steps: [] };
  if (!hasToken) return { tone: "info", title: "Connecting this device to push…", steps: [] };
  return null;
}
