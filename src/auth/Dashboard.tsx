import { Link } from "react-router-dom";
import { Mail, PartyPopper, type LucideIcon } from "lucide-react";
import { useAuth } from "./AuthContext";
import type { Feature } from "./permissions";
import { Page } from "../party/Workspace";
/** One card per feature. To add a feature: add it in permissions.ts, then add its card here and its route guard in App.tsx. */
const CARDS: { feature: Feature; to: string; title: string; text: string; icon: LucideIcon }[] = [
  { feature: "contact", to: "/contact-inbox", title: "Contact Form", text: "Messages received through uniquem.ca.", icon: Mail },
  { feature: "party", to: "/party", title: "Party", text: "Parties, guest lists and door check-in.", icon: PartyPopper },
];
/** The page everyone lands on after signing in: one card for each feature their role includes. */
export default function Dashboard() {
  const { can } = useAuth();
  return <Page account title="Dashboard" subtitle="Choose where to work.">
    <section className="ws-cards" aria-label="Workspace">
      {CARDS.filter((card) => can(card.feature)).map(({ feature, to, title, text, icon: Icon }) => <Link key={feature} className="ws-card" to={to}><Icon size={30} /><h2>{title}</h2><p>{text}</p></Link>)}
    </section>
  </Page>;
}
