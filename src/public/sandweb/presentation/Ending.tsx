import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Check, Mail, MessageSquare, Phone, RotateCcw } from "lucide-react";
import { trackEvent } from "../../../core/analytics";

type Method = "call" | "email" | "self";
type Form = { name: string; phone: string; email: string; company: string; website: string };
// SandWeb contact details: shown ONLY in the "I'll reach out" panel below.
// scripts/check-seo.mjs fails the build if they appear anywhere else.
const PHONE_DISPLAY = "1 (403) 390-0067", PHONE_TEL = "tel:+14033900067", SANDWEB_EMAIL = "sandweb@uniquem.ca";

async function submit(data: Record<string, string>) { return (await import("../../../core/api")).submitContactInquiry(data); }
export function isPreviewHost() { if (typeof window === "undefined") return false; const h = window.location.hostname; return h !== "uniquem.ca" && h !== "www.uniquem.ca"; }
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
/** Accepts North American (10 digits, optional leading 1) or international (+, 8 to 15 digits) numbers. */
export function phoneOk(v: string) {
  const raw = v.trim(); if (!/^[+\d\s().-]+$/.test(raw)) return false;
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return digits.length >= 8 && digits.length <= 15;
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

// Keep the lead a plain inquiry, like the contact page: each field is sent once
// and the notification email lists them. No extra "Source:" or repeated lines.
export function leadPayload(method: "call" | "email", f: Form, preview: boolean) {
  const message = `Please ${method === "call" ? "call" : "email"} me about SandWeb.${preview ? " (Preview test)" : ""}`;
  const data: Record<string, string> = { inquiryType: "product", productName: "SandWeb", name: f.name.trim(), message, website: f.website };
  if (method === "call") data.phone = f.phone.trim(); else data.email = f.email.trim();
  if (f.company.trim()) data.company = f.company.trim();
  return data;
}

export default function EndingChoices({ showChoices, onReplay, onPanel }: { showChoices: boolean; onReplay: () => void; onPanel: (open: boolean) => void }) {
  const [method, setMethod] = useState<Method | null>(null), [form, setForm] = useState<Form>({ name: "", phone: "", email: "", company: "", website: "" });
  const [errors, setErrors] = useState<Partial<Record<"name" | "phone" | "email" | "submit", string>>>({}), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const preview = isPreviewHost();
  const open = (m: Method | null) => { if (m) trackEvent("contact_option_select", { option: m === "self" ? "reach_out_myself" : m === "call" ? "call_me" : "email_me" }); setMethod(m); setErrors({}); onPanel(m !== null); };
  const field = (key: keyof Form, label: string, opts: { type?: string; optional?: boolean; auto?: string; err?: string } = {}) =>
    <label>{label}{opts.optional && <span> (optional)</span>}<input type={opts.type ?? "text"} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} autoComplete={opts.auto} maxLength={key === "name" ? 100 : 120} aria-invalid={Boolean(opts.err)} inputMode={key === "phone" ? "tel" : undefined} />{opts.err && <em>{opts.err}</em>}</label>;

  async function send(event: FormEvent) {
    event.preventDefault(); if (form.website || (method !== "call" && method !== "email")) return;
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = "Please enter your name.";
    if (method === "call" && !phoneOk(form.phone)) next.phone = "Please enter a valid phone number.";
    if (method === "email" && !emailOk(form.email)) next.email = "Please enter a valid email address.";
    setErrors(next); if (Object.keys(next).length) return;
    setBusy(true);
    try { await submit(leadPayload(method, form, preview)); trackEvent("lead_form_submit", { form: "sandweb_presentation", method, product_name: "SandWeb" }); setDone(true); }
    catch { setErrors({ submit: "We couldn't send that just now. Please try again, or go back and choose \u201cI'll reach out\u201d." }); }
    finally { setBusy(false); }
  }

  if (done) return <div className="swp-panel swp-done" role="status">
    <Check className="check" />
    <h3>Thanks, {form.name.trim().split(" ")[0]}!</h3>
    <p>{method === "call" ? "We'll give you a call soon to talk about SandWeb and your wells." : "We'll email you soon about SandWeb and your wells."}</p>
    <button className="swp-replay" onClick={onReplay}><RotateCcw size={15} /> Replay the video</button>
  </div>;

  if (method === "self") return <div className="swp-panel">
    <button className="swp-panel-back" onClick={() => open(null)}><ArrowLeft size={15} /> Back</button>
    <h3>Reach the SandWeb team</h3>
    <p>We'd love to hear about your wells.</p>
    <div className="swp-contact">
      <a href={PHONE_TEL}><Phone /><span><b>{PHONE_DISPLAY}</b><small>Tap to call</small></span></a>
      <a href={`mailto:${SANDWEB_EMAIL}?subject=${encodeURIComponent("SandWeb")}`}><Mail /><span><b>{SANDWEB_EMAIL}</b><small>Tap to email</small></span></a>
    </div>
  </div>;

  if (method) return <div className="swp-panel">
    <button className="swp-panel-back" onClick={() => open(null)}><ArrowLeft size={15} /> Back</button>
    <h3>{method === "call" ? "We'll call you" : "We'll email you"}</h3>
    <p>{method === "call" ? "Leave your number and the SandWeb team will call you back." : "Leave your email and the SandWeb team will be in touch."}</p>
    <form onSubmit={send} noValidate>
      {field("name", "Name", { auto: "name", err: errors.name })}
      {method === "call" ? field("phone", "Phone", { type: "tel", auto: "tel", err: errors.phone }) : field("email", "Email", { type: "email", auto: "email", err: errors.email })}
      {field("company", "Company", { optional: true, auto: "organization" })}
      <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
      <button className="sw-button" disabled={busy}>{busy ? "Sending…" : method === "call" ? "Request a call" : "Email me"} <ArrowUpRight size={17} /></button>
      {errors.submit && <p className="swp-error" role="alert">{errors.submit}</p>}
    </form>
  </div>;

  return showChoices ? <>
    <div className="swp-choices" role="group" aria-label="How would you like to hear from us?">
      <button onClick={() => open("call")}><Phone /> Call me</button>
      <button onClick={() => open("email")}><Mail /> Email me</button>
      <button onClick={() => open("self")}><MessageSquare /> I'll reach out</button>
    </div>
    <button className="swp-replay" onClick={onReplay}><RotateCcw size={15} /> Replay</button>
  </> : null;
}
