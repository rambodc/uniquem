// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";
import { RESUME_AFTER_MS, emitResume, isChunkLoadError, onResume, reloadOnce, shouldResume, watchResume } from "./resilience";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ""; });

describe("after a deploy: missing chunks reload the page once, never a blank screen", () => {
  it("recognises chunk-load failures from Chrome, Safari, Firefox and Vite", () => {
    for (const message of ["Failed to fetch dynamically imported module: https://uniquem.ca/assets/ProfileApp-OLD.js", "Importing a module script failed.", "error loading dynamically imported module", "Unable to preload CSS for /assets/x.css", "'text/html' is not a valid JavaScript MIME type."]) expect(isChunkLoadError(new TypeError(message)), message).toBe(true);
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
  });
  it("reloads at most once a minute, so a real outage can't loop", () => {
    const store = new Map<string, string>(), storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }, reload = vi.fn();
    expect(reloadOnce(1_000_000, storage, reload)).toBe(true);
    expect(reloadOnce(1_030_000, storage, reload)).toBe(false);
    expect(reloadOnce(1_070_000, storage, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});

describe("coming back to a tab", () => {
  it("refreshes after being hidden a minute or more, on a back/forward-cache restore and when back online; not after a quick switch", () => {
    let now = 0, hidden = false;
    const doc = Object.defineProperty(new EventTarget(), "hidden", { get: () => hidden }) as unknown as Document, win = new EventTarget() as unknown as Window, resume = vi.fn();
    const stop = watchResume(resume, win, doc, () => now);
    const show = (afterMs: number) => { hidden = true; doc.dispatchEvent(new Event("visibilitychange")); now += afterMs; hidden = false; doc.dispatchEvent(new Event("visibilitychange")); };
    show(5_000); expect(resume).not.toHaveBeenCalled();
    show(10 * 60_000); expect(resume).toHaveBeenCalledTimes(1);
    win.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true })); expect(resume).toHaveBeenCalledTimes(2);
    win.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: false })); expect(resume).toHaveBeenCalledTimes(2);
    win.dispatchEvent(new Event("online")); expect(resume).toHaveBeenCalledTimes(3);
    stop(); show(RESUME_AFTER_MS * 5); expect(resume).toHaveBeenCalledTimes(3);
    expect(shouldResume(null, 10 ** 9)).toBe(false);
  });
  it("open pages are told to reload their data", () => {
    const page = vi.fn(), off = onResume(page);
    emitResume(); off(); emitResume();
    expect(page).toHaveBeenCalledTimes(1);
  });
});

describe("error boundary", () => {
  it("shows a loader instead of a blank page and retries by itself", async () => {
    vi.useFakeTimers();
    let fail = true;
    const Flaky = () => { if (fail) throw new Error("render blew up"); return <p>Guest list</p>; };
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const host = document.createElement("div"); document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(<ErrorBoundary resetKey="/party"><Flaky /></ErrorBoundary>));
    expect(host.textContent).toContain("Reconnecting");
    fail = false;
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(host.textContent).toBe("Guest list");
    act(() => root.unmount()); spy.mockRestore();
  });
  it("after three failed retries it offers Reload (still never blank)", async () => {
    vi.useFakeTimers();
    const Broken = () => { throw new Error("always"); };
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const host = document.createElement("div"); document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(<ErrorBoundary resetKey="/x"><Broken /></ErrorBoundary>));
    for (const ms of [1000, 3000, 8000]) await act(async () => { vi.advanceTimersByTime(ms); });
    expect(host.textContent).toContain("could not be loaded"); expect(host.querySelector("button")?.textContent).toBe("Reload");
    act(() => root.unmount()); spy.mockRestore();
  });
});
