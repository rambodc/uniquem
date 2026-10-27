import { Link } from "react-router-dom";
import { Mail, PartyPopper } from "lucide-react";
import { useAuth } from "./AuthContext";
import { Page } from "../party/Workspace";
/** The page staff land on after signing in: exactly two cards. */
export default function Dashboard() {
  const { access } = useAuth();
  return <Page account title="Dashboard" subtitle="Choose where to work.">
    <section className="ws-cards" aria-label="Workspace">
      {access?.inbox
        ? <Link className="ws-card" to="/contact-inbox"><Mail size={30} /><h2>Contact Form</h2><p>Messages received through uniquem.ca.</p></Link>
        : <div className="ws-card disabled" aria-disabled="true"><Mail size={30} /><h2>Contact Form</h2><p>Owner access only.</p></div>}
      <Link className="ws-card" to="/party"><PartyPopper size={30} /><h2>Party</h2><p>Parties, guest lists and door check-in.</p></Link>
    </section>
  </Page>;
}
