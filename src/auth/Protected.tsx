import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
export default function Protected() { const { user, loading, allowed } = useAuth(), location = useLocation(); if (loading) return <main className="center-state">Opening your Uniquem workspace…</main>; if (!user || !allowed || !user.emailVerified) return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname)}`} replace />; return <Outlet />; }
