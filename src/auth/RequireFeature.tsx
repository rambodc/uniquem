import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Feature } from "./permissions";
/** Route guard. Without `feature` it only needs an account with a role (the dashboard); with `feature` the role must include it.
 * The server decides who may do what (functions/permissions.js, functions/core.js); this only keeps screens hidden. */
export default function RequireFeature({ feature }: { feature?: Feature }) {
  const { user, loading, role, accessLoading, can, logout } = useAuth(), location = useLocation();
  if (loading || accessLoading) return <main className="center-state">Opening your Uniquem workspace…</main>;
  if (!user || !user.emailVerified) return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!role) return <main className="center-state denied"><div><p>This account is not authorized for the Uniquem workspace.</p><button className="ws-button" onClick={() => void logout()}>Sign out</button></div></main>;
  if (feature && !can(feature)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
