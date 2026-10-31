import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getToken } from "firebase/app-check";
import { appCheck, auth, authReady } from "../core/firebase";
import { emitResume, watchResume } from "../core/resilience";
import { getAccess, type Access, type Profile } from "../core/api";
import type { MiniAppId, UserType } from "./miniApps";
type AuthState = {
  user: User | null; loading: boolean;
  /** The signed-in account's user type, or null while loading / when the account has no access. */
  type: UserType | null; miniApps: MiniAppId[];
  /** Names, email and small avatar of the signed-in account; null while loading or without access. */
  profile: Profile | null;
  /** Asks the server again who this account is (after the photo changes, so the header avatar updates). */
  refreshAccess: () => Promise<void>;
  /** True while the server is still being asked what this account may open. */
  accessLoading: boolean;
  /** Whether the signed-in account may open a mini app. The server enforces this again on every call. */
  can: (app: MiniAppId) => boolean;
  logout: () => Promise<void>;
};
const NO_ACCESS: Access = { type: null, miniApps: [], profile: null };
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(true), [access, setAccess] = useState<Access | null>(null), [accessLoading, setAccessLoading] = useState(false);
  // The sign-in state normally arrives at once; if it hasn't after 8 s, stop waiting and treat the visitor as signed out (sign-in page).
  useEffect(() => {
    let active = true, stop: (() => void) | undefined;
    const fallback = setTimeout(() => { if (active) setLoading(false); }, 8_000);
    void authReady.then(() => { if (active) stop = onAuthStateChanged(auth, (next) => { if (active) { clearTimeout(fallback); setUser(next); setLoading(false); } }); });
    return () => { active = false; clearTimeout(fallback); stop?.(); };
  }, []);
  const uid = user?.uid, verified = user?.emailVerified === true;
  useEffect(() => {
    let active = true;
    if (!uid || !verified) { queueMicrotask(() => { if (active) { setAccess(null); setAccessLoading(false); } }); return () => { active = false; }; }
    queueMicrotask(() => { if (active) setAccessLoading(true); });
    getAccess().then((result) => { if (active) setAccess(result); }, () => { if (active) setAccess(NO_ACCESS); }).finally(() => { if (active) setAccessLoading(false); });
    return () => { active = false; };
  }, [uid, verified]);
  // Back from the background (or the back/forward cache, or offline): refresh the sign-in and App Check tokens first, then who this
  // account is, then tell open pages to reload their data. Failures keep what is on screen; nothing goes blank.
  useEffect(() => watchResume(() => {
    const current = auth.currentUser;
    void Promise.allSettled([current?.getIdToken(), appCheck ? getToken(appCheck) : undefined])
      .then(() => current ? getAccess().then(setAccess, () => undefined) : undefined)
      .finally(emitResume);
  }), []);
  const value = useMemo<AuthState>(() => {
    const miniApps = access?.miniApps ?? [];
    return { user, loading, type: access?.type ?? null, miniApps, profile: access?.profile ?? null, refreshAccess: async () => setAccess(await getAccess()), accessLoading: Boolean(user && verified && (accessLoading || !access)), can: (app) => miniApps.includes(app), logout: () => signOut(auth) };
  }, [user, loading, verified, access, accessLoading]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error("AuthProvider is missing"); return value; }
