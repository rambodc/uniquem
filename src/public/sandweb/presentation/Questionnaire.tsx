import { lazy, Suspense, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { leadMessage, questions, summarize, warningSigns, type Answers } from "./questionnaire";

const QuizBackdrop = lazy(() => import("./QuizBackdrop"));
async function submit(data: Record<string, string>) { return (await import("../../../core/api")).submitContactInquiry(data); }
const emailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export function isPreviewHost() { if (typeof window === "undefined") return false; const h = window.location.hostname; return h !== "uniquem.ca" && h !== "www.uniquem.ca"; }

export default function Questionnaire({ webgl, compact, onReplay }: { webgl: boolean; compact: boolean; onReplay: () => void }) {
  const [step, setStep] = useState(0), [answers, setAnswers] = useState<Answers>({}), [info, setInfo] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", website: "" }), [errors, setErrors] = useState<{ name?: string; email?: string; submit?: string }>({}), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const preview = isPreviewHost();
  const total = questions.length, onSummary = step >= total, question = questions[Math.min(step, total - 1)];
  const scene = done || onSummary ? "summary" : question.scene, answer = onSummary ? undefined : answers[question.id];

  function choose(value: string) {
    setAnswers((a) => ({ ...a, [question.id]: value }));
    if (question.id === "sand" && value === "unsure") { setInfo(true); return; }
    window.setTimeout(() => setStep((s) => s + 1), 650);
  }
  async function send(event: FormEvent) {
    event.preventDefault(); if (form.website) return;
    const next: typeof errors = {};
    if (form.name.trim().length < 2) next.name = "Please enter your name.";
    if (!emailOk(form.email)) next.email = "Please enter a valid email address.";
    setErrors(next); if (next.name || next.email) return;
    setBusy(true);
    try { await submit({ inquiryType: "product", productName: "SandWeb", name: form.name.trim(), email: form.email.trim(), message: leadMessage(answers, preview), website: form.website }); setDone(true); }
    catch { setErrors({ submit: "We couldn't send that just now. Please try again, or call (403) 262-2004." }); }
    finally { setBusy(false); }
  }
  const summary = summarize(answers);

  return <section className="swq" aria-label="SandWeb questionnaire">
    <div className="swq-bg" aria-hidden="true">{webgl ? <Suspense fallback={null}><QuizBackdrop scene={scene} answer={answer} compact={compact} /></Suspense> : null}</div>
    {preview && <p className="swq-preview">Preview: submissions are marked as test leads</p>}
    {!done && <div className="swq-progress" aria-label={`Step ${Math.min(step + 1, total + 1)} of ${total + 1}`}>{Array.from({ length: total + 1 }, (_, i) => <i key={i} className={i < step ? "done" : i === step ? "active" : ""} />)}</div>}

    {!onSummary && !info && <div className="swq-card" key={question.id}>
      <span className="sw-kicker">Question {step + 1} of {total}</span>
      <h2>{question.title}</h2>
      <div className={`swq-options n${question.options.length}`}>{question.options.map((o) => <button key={o.value} className={answers[question.id] === o.value ? "selected" : ""} onClick={() => choose(o.value)}>{o.label}{answers[question.id] === o.value && <Check size={18} />}</button>)}</div>
      {step > 0 && <button className="swq-back" onClick={() => setStep((s) => s - 1)}><ArrowLeft size={15} /> Back</button>}
    </div>}

    {info && <div className="swq-card" key="info">
      <span className="sw-kicker">Worth checking</span>
      <h2>Common warning signs of sand or fines production</h2>
      <ul className="swq-signs">{warningSigns.map((s) => <li key={s}>{s}</li>)}</ul>
      <button className="sw-button" onClick={() => { setInfo(false); setStep(1); }}>Continue <ArrowRight size={17} /></button>
    </div>}

    {onSummary && !done && <div className="swq-card swq-summary" key="summary">
      <span className="sw-kicker">Your SandWeb snapshot</span>
      <h2>{summary.headline}</h2>
      <ul>{summary.points.map((p) => <li key={p}>{p}</li>)}</ul>
      <form onSubmit={send} noValidate>
        <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} autoComplete="name" aria-invalid={Boolean(errors.name)} />{errors.name && <em>{errors.name}</em>}</label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={200} autoComplete="email" aria-invalid={Boolean(errors.email)} />{errors.email && <em>{errors.email}</em>}</label>
        <label className="honeypot" aria-hidden="true">Website<input tabIndex={-1} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
        <button className="sw-button" disabled={busy}>{busy ? "Sending…" : "Send me pricing and next steps"} <ArrowUpRight size={17} /></button>
        <p className="swq-lab"><FlaskConical size={15} /> Free lab test on your sand or core available.</p>
        {errors.submit && <p className="swq-error" role="alert">{errors.submit}</p>}
      </form>
      <button className="swq-back" onClick={() => setStep(total - 1)}><ArrowLeft size={15} /> Back</button>
    </div>}

    {done && <div className="swq-card swq-done" key="done">
      <span className="sw-kicker"><Check size={15} /> Sent</span>
      <h2>Thanks, {form.name.trim().split(" ")[0]}. We'll be in touch.</h2>
      <p>The Uniquem team will follow up with pricing and next steps for SandWeb, including how to arrange a free lab test on your sand or core.</p>
      <div className="sw-actions"><button className="sw-button ghost" onClick={onReplay}>Replay the video</button><Link className="sw-button ghost" to="/chemicals/sandweb">Back to SandWeb</Link></div>
    </div>}
  </section>;
}
