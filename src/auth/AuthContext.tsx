import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth, authReady } from "../core/firebase";
import { getStaffAccess, type StaffAccess } from "../core/api";
import type { Feature, Role } from "./permissions";
type AuthState = {
  user: User | null; loading: boolean;
  /** The signed-in account's role, or null while loading / when the account has no access. */
  role: Role | null; features: Feature[];
  /** True while the server is still being asked what this account may open. */
  accessLoading: boolean;
  /** Whether the signed-in account may use a feature. The server enforces this again on every call. */
  can: (feature: Feature) => boolean;
  logout: () => Promise<void>;
};
const NO_ACCESS: StaffAccess = { role: null, features: [] };
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(true), [access, setAccess] = useState<StaffAccess | null>(null), [accessLoading, setAccessLoading] = useState(false);
  useEffect(() => { let active = true; void authReady.then(() => onAuthStateChanged(auth, (next) => { if (active) { setUser(next); setLoading(false); } })); return () => { active = false; }; }, []);
  const uid = user?.uid, verified = user?.emailVerified === true;
  useEffect(() => {
    let active = true;
    if (!uid || !verified) { queueMicrotask(() => { if (active) { setAccess(null); setAccessLoading(false); } }); return () => { active = false; }; }
    queueMicrotask(() => { if (active) setAccessLoading(true); });
    getStaffAccess().then((result) => { if (active) setAccess(result); }, () => { if (active) setAccess(NO_ACCESS); }).finally(() => { if (active) setAccessLoading(false); });
    return () => { active = false; };
  }, [uid, verified]);
  const value = useMemo<AuthState>(() => {
    const features = access?.features ?? [];
    return { user, loading, role: access?.role ?? null, features, accessLoading: Boolean(user && verified && (accessLoading || !access)), can: (feature) => features.includes(feature), logout: () => signOut(auth) };
  }, [user, loading, verified, access, accessLoading]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error("AuthProvider is missing"); return value; }
