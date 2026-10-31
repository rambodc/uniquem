/** True only inside the native iOS app (Capacitor injects window.Capacitor before the page loads). Never true on the website,
 * and it imports nothing, so the website bundle stays the same. */
export const isNativeApp = () => typeof window !== "undefined" && (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.() === true;
