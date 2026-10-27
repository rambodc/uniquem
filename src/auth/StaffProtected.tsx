import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
/** Guard for the dashboard and Party pages. The server decides who is staff (see functions/core.js);
 * this only keeps the screens hidden from people who are not signed in or not allowed. */
export default function StaffProtected() {
  const { user, loading, access, accessLoading, logout } = useAuth(), location = useLocation();
  if (loading || (user && user.emailVerified && (accessLoading || !access))) return <main className="center-state">Opening your Uniquem workspace…</main>;
  if (!user || !user.emailVerified) return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!access?.party) return <main className="center-state denied"><div><p>This account is not authorized for the Uniquem workspace.</p><button className="ws-button" onClick={() => void logout()}>Sign out</button></div></main>;
  return <Outlet />;
}
