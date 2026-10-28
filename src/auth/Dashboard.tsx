import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import { useAuth } from "./AuthContext";
import { ICONS, MINI_APPS, USER_TYPE_LABELS } from "./miniApps";
import AccountBar from "./AccountBar";
import Avatar from "./Avatar";
import "./shell.css";
import "../party/party.css";

const greeting = (hour: number) => hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

/** The page everyone lands on after signing in: a launcher with one tile for each mini app the signed-in account may open. The list, icons and colours come from the registry (functions/miniApps.js). */
export default function Dashboard() {
  const { can, profile, type } = useAuth(), apps = MINI_APPS.filter((app) => can(app.id));
  useEffect(() => { document.title = "Dashboard | Uniquem private"; }, []);
  return <main className="ws-page">
    <AccountBar />
    {profile && <section className="ws-hero" aria-label="Welcome">
      <Avatar src={profile.thumbDataUrl} firstName={profile.firstName} lastName={profile.lastName} size={76} />
      <div className="ws-hero-text">
        <span className="ws-eyebrow">Private workspace</span>
        <h1>{greeting(new Date().getHours())}, {profile.firstName}</h1>
        <p>{type ? USER_TYPE_LABELS[type] : ""} · {profile.email}</p>
      </div>
    </section>}
    <div className="ws-apps-head"><h2>Your mini apps</h2><span>{apps.length} available</span></div>
    <section className="ws-tiles" aria-label="Mini apps">
      {apps.map(({ id, route, name, description, icon, accent }) => { const Icon = ICONS[icon]; return <Link key={id} className="ws-tile" style={{ "--tile": accent } as CSSProperties} to={route}>
        <span className="ws-tile-icon"><Icon size={28} strokeWidth={2} /></span>
        <h2>{name}</h2><p>{description}</p>
        <span className="ws-tile-open">Open <ArrowRight size={16} /></span>
        <Icon className="ws-tile-mark" aria-hidden="true" strokeWidth={1.4} />
      </Link>; })}
    </section>
  </main>;
}
