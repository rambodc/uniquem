import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
// Contact inbox guard (unchanged rule: owner account only). A verified staff member who is not the
// owner goes back to the dashboard instead of the sign-in page, so there is no redirect loop.
export default function Protected() { const { user, loading, allowed } = useAuth(), location = useLocation(); if (loading) return <main className="center-state">Opening your Uniquem workspace…</main>; if (user && user.emailVerified && !allowed) return <Navigate to="/dashboard" replace />; if (!user || !allowed || !user.emailVerified) return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname)}`} replace />; return <Outlet />; }
