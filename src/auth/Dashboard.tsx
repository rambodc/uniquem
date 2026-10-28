import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ICONS, MINI_APPS } from "./miniApps";
import { Page } from "../party/Workspace";

/** The page everyone lands on after signing in: one tile for each mini app the signed-in account may open (the registry is functions/miniApps.js). */
export default function Dashboard() {
  const { can } = useAuth(), apps = MINI_APPS.filter((app) => can(app.id));
  return <Page account title="Dashboard" subtitle="Choose a mini app.">
    {apps.length === 0 && <div className="ws-empty">No mini apps are assigned to your account yet. Ask a super admin to give you access.</div>}
    <section className="ws-cards" aria-label="Mini apps">
      {apps.map(({ id, route, name, description, icon }) => { const Icon = ICONS[icon]; return <Link key={id} className="ws-card" to={route}><Icon size={30} /><h2>{name}</h2><p>{description}</p></Link>; })}
    </section>
  </Page>;
}
