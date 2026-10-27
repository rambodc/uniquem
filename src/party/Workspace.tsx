import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS } from "../auth/permissions";
import "./party.css";

/** Shared page frame for the private workspace pages. The account block with the only Sign out button is shown on the dashboard alone (account). */
export function Page({ eyebrow = "Private workspace", title, subtitle, back, actions, children, narrow = false, account = false }: { eyebrow?: string; title: string; subtitle?: ReactNode; back?: { to: string; label: string }; actions?: ReactNode; children: ReactNode; narrow?: boolean; account?: boolean }) {
  const { user, role, logout } = useAuth();
  useEffect(() => { document.title = `${title} | Uniquem private`; }, [title]);
  return <main className={`ws-page${narrow ? " ws-narrow" : ""}`}>
    <header className="ws-header">
      <div>{back && <Link className="ws-back" to={back.to}>← {back.label}</Link>}<span className="ws-eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      {account && <div className="ws-user"><span className="ws-email">{user?.email}</span>{role && <span className="ws-role">{ROLE_LABELS[role]}</span>}<button className="ws-chip" onClick={() => void logout()}><LogOut size={16} /> Sign out</button></div>}
    </header>
    {actions && <div className="ws-actions">{actions}</div>}
    {children}
  </main>;
}

export function Confirm({ title, body, confirmLabel, busy, onConfirm, onCancel }: { title: string; body: ReactNode; confirmLabel: string; busy?: boolean; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel(); }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [onCancel]);
  return <div className="ws-modal" role="dialog" aria-modal="true" aria-label={title} onClick={onCancel}>
    <div className="ws-modal-card" onClick={(event) => event.stopPropagation()}>
      <h2>{title}</h2><p>{body}</p>
      <div className="ws-modal-buttons"><button className="ws-button ghost" onClick={onCancel} disabled={busy}>Cancel</button><button className="ws-button danger" onClick={onConfirm} disabled={busy}>{busy ? "Working…" : confirmLabel}</button></div>
    </div>
  </div>;
}
export const messageOf = (error: unknown, fallback: string) => { const text = error instanceof Error ? error.message : ""; return text && !/^(internal|unavailable|unauthenticated|functions\/)/i.test(text) && text.length < 160 ? text : fallback; };
