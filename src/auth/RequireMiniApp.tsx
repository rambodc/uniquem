import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { MiniAppId } from "./miniApps";

/** Route guard. Without `app` it only needs an account with access (the dashboard); with `app` the account must be allowed to open that mini app.
 * The server decides who may do what (functions/core.js requireMiniApp / requireSuperAdmin); this only keeps screens hidden. */
export default function RequireMiniApp({ app }: { app?: MiniAppId }) {
  const { user, loading, type, accessLoading, can, logout } = useAuth(), location = useLocation();
  if (loading || accessLoading) return <main className="center-state">Opening your Uniquem workspace…</main>;
  if (!user || !user.emailVerified) return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (!type) return <main className="center-state denied"><div><p>This account is not authorized for the Uniquem workspace.</p><button className="ws-button" onClick={() => void logout()}>Sign out</button></div></main>;
  if (app && !can(app)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
