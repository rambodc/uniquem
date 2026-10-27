import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { ALLOWED_EMAIL, auth, authReady } from "../core/firebase";
import { getStaffAccess, type StaffAccess } from "../core/api";
type AuthState = { user: User | null; loading: boolean; allowed: boolean; access: StaffAccess | null; accessLoading: boolean; logout: () => Promise<void> };
const Context = createContext<AuthState | null>(null);
// `allowed` is the contact-inbox check (owner account). `access` is what the server says this
// signed-in account may open (Party staff access, and whether the contact inbox is included).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(true), [access, setAccess] = useState<StaffAccess | null>(null), [accessLoading, setAccessLoading] = useState(false);
  useEffect(() => { let active = true; void authReady.then(() => onAuthStateChanged(auth, (next) => { if (active) { setUser(next); setLoading(false); } })); return () => { active = false; }; }, []);
  const uid = user?.uid, verified = user?.emailVerified === true;
  useEffect(() => {
    let active = true;
    if (!uid || !verified) { queueMicrotask(() => { if (active) { setAccess(null); setAccessLoading(false); } }); return () => { active = false; }; }
    queueMicrotask(() => { if (active) setAccessLoading(true); });
    getStaffAccess().then((result) => { if (active) setAccess(result); }, () => { if (active) setAccess({ party: false, inbox: false }); }).finally(() => { if (active) setAccessLoading(false); });
    return () => { active = false; };
  }, [uid, verified]);
  const allowed = user?.email?.toLowerCase() === ALLOWED_EMAIL;
  const value = useMemo(() => ({ user, loading, allowed, access, accessLoading, logout: () => signOut(auth) }), [user, loading, allowed, access, accessLoading]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error("AuthProvider is missing"); return value; }
