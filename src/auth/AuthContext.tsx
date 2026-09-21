import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { ALLOWED_EMAIL, auth, authReady } from "../core/firebase";
type AuthState = { user: User | null; loading: boolean; allowed: boolean; logout: () => Promise<void> };
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) { const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(true); useEffect(() => { let active = true; void authReady.then(() => onAuthStateChanged(auth, (next) => { if (active) { setUser(next); setLoading(false); } })); return () => { active = false; }; }, []); const allowed = user?.email?.toLowerCase() === ALLOWED_EMAIL; const value = useMemo(() => ({ user, loading, allowed, logout: () => signOut(auth) }), [user, loading, allowed]); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useAuth() { const value = useContext(Context); if (!value) throw new Error("AuthProvider is missing"); return value; }
