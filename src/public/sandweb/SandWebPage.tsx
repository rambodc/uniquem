import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronDown, Globe2, Layers, ShieldCheck, Wrench, TrendingUp, BadgeDollarSign, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import type { PublicProduct } from "../products";
import { applications, benefits, comparison, faqs, storySteps } from "./content";
import SavingsCalculator from "./SavingsCalculator";
import type { ProgressRef } from "./SandWebScene";

const SandWebScene = lazy(() => import("./SandWebScene"));
const benefitIcons = [Layers, ShieldCheck, Wrench, TrendingUp, BadgeDollarSign, FlaskConical];

function canRenderWebGL() { try { const canvas = document.createElement("canvas"); return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")); } catch { return false; } }

function StageFallback({ product }: { product: PublicProduct }) {
  return <div className="sw-fallback"><img src={product.image} alt="" /><div className="sw-fallback-glow" /></div>;
}

function Hud({ step }: { step: number }) {
  const current = storySteps[step];
  const bars = [["Production", current.hud.production, "good"], ["Sand returns", current.hud.sand, "bad"], ["Equipment wear", current.hud.wear, "bad"]] as const;
  return <div className="sw-hud">
    <div className="sw-hud-head"><span>{String(step + 1).padStart(2, "0")} / {String(storySteps.length).padStart(2, "0")}</span><strong>{current.depth}</strong></div>
    {bars.map(([label, value, tone]) => <div className={`sw-hud-bar ${tone}`} key={label}><small>{label}</small><i><b style={{ width: `${Math.round(value * 100)}%` }} /></i></div>)}
    <em>Illustrative</em>
  </div>;
}

export default function SandWebPage({ product, inquiry }: { product: PublicProduct; inquiry?: ReactNode }) {
  const story = useRef<HTMLElement>(null);
  const progress = useRef(0) as ProgressRef;
  const [step, setStep] = useState(0), [mode, setMode] = useState<"static" | "3d">("static"), [compact, setCompact] = useState(false), [active, setActive] = useState(true);

  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)"), mobile = matchMedia("(max-width: 760px)");
    const sync = () => { setCompact(mobile.matches); setMode(!motion.matches && canRenderWebGL() ? "3d" : "static"); };
    sync(); motion.addEventListener("change", sync); mobile.addEventListener("change", sync);
    return () => { motion.removeEventListener("change", sync); mobile.removeEventListener("change", sync); };
  }, []);

  useEffect(() => {
    const element = story.current; if (!element) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = element.getBoundingClientRect(), total = Math.max(1, rect.height - window.innerHeight);
      const value = Math.min(1, Math.max(0, -rect.top / total));
      progress.current = value;
      setStep(Math.min(storySteps.length - 1, Math.round(value * (storySteps.length - 1))));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: "100px" });
    observer.observe(element);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [progress]);

  return <main className="sw-page">
    <section className="sw-story" ref={story} aria-label="SandWeb step-by-step product demo">
      <div className="sw-stage" aria-hidden="true">
        {mode === "3d" ? <Suspense fallback={<StageFallback product={product} />}><SandWebScene progress={progress} compact={compact} active={active} /></Suspense> : <StageFallback product={product} />}
        <div className="sw-vignette" />
        <Hud step={step} />
        <ol className="sw-dots">{storySteps.map((item, index) => <li key={item.id} className={index === step ? "active" : index < step ? "done" : ""} />)}</ol>
        {step === 0 && <div className="sw-scroll-cue"><span>Scroll the demo</span><ChevronDown size={18} /></div>}
      </div>
      <div className="sw-steps">
        {storySteps.map((item, index) => <article className={`sw-step${index === 0 ? " sw-step-hero" : ""}`} id={`step-${item.id}`} key={item.id}>
          <div className="sw-card">
            {index === 0 && <nav className="sw-breadcrumb" aria-label="Breadcrumb"><Link to="/chemicals">Chemicals</Link><span>/</span><span>{product.name}</span></nav>}
            <span className="sw-kicker">{item.kicker}</span>
            {index === 0 ? <><h1>SandWeb <span>sand consolidation chemistry</span></h1><p className="sw-lede">{item.title}.</p></> : <h2>{item.title}</h2>}
            <p>{item.copy}</p>
            {index === 0 && <div className="sw-actions"><Link className="sw-button" to="/contact-us">Request a quote <ArrowUpRight size={17} /></Link><a className="sw-button ghost" href="#savings-calculator">Estimate savings</a></div>}
            {index === 4 && <div className="sw-modes"><span>Hydraulic fracturing</span><span>Stimulation &amp; remedial</span></div>}
          </div>
        </article>)}
      </div>
    </section>

    <section className="sw-section sw-how" id="how-it-works" aria-labelledby="sw-how-title">
      <div className="sw-section-head"><span className="sw-kicker">How it works</span><h2 id="sw-how-title">How SandWeb sand consolidation works</h2><p>{product.description}</p></div>
      <ol className="sw-mechanism">
        <li><b>1</b><h3>Placed with the treatment</h3><p>SandWeb is pumped as a liquid, either with the fracturing fluid or as a stand-alone stimulation or remedial treatment, and carried into the sand pack.</p></li>
        <li><b>2</b><h3>Bonds grain to grain</h3><p>It binds proppant and formation sand grains at their contact points, building a consolidated web through the pack.</p></li>
        <li><b>3</b><h3>Holds sand, keeps flow open</h3><p>The pore space between grains stays open, so oil and gas flow to the wellbore while the sand stays locked in place.</p></li>
      </ol>
    </section>

    <section className="sw-section sw-uses" aria-labelledby="sw-uses-title">
      <div className="sw-section-head"><span className="sw-kicker">Two ways to use it</span><h2 id="sw-uses-title">One sand control chemical for fracturing and stimulation</h2><p>Most sand control options only work at one point in a well's life. SandWeb works both when the well is fractured and later on wells that are already producing sand.</p></div>
      <div className="sw-use-grid">{applications.map((use) => <article key={use.title}><h3>{use.title}</h3><p>{use.copy}</p><ul>{use.points.map((point) => <li key={point}>{point}</li>)}</ul></article>)}</div>
    </section>

    <section className="sw-section sw-benefits" aria-labelledby="sw-benefits-title">
      <div className="sw-section-head"><span className="sw-kicker">Why operators use SandWeb</span><h2 id="sw-benefits-title">Sand flowback control that saves money</h2><p>There is nothing else like SandWeb on the market. One treatment addresses the whole chain of sand problems, from the fracture to the surface equipment.</p></div>
      <div className="sw-benefit-grid">{benefits.map((benefit, index) => { const Icon = benefitIcons[index]; return <article key={benefit.title}><Icon aria-hidden="true" /><h3>{benefit.title}</h3><p>{benefit.copy}</p></article>; })}</div>
    </section>

    <section className="sw-section sw-compare" aria-labelledby="sw-compare-title">
      <div className="sw-section-head"><span className="sw-kicker">Resin-coated sand alternative</span><h2 id="sw-compare-title">SandWeb vs resin-coated sand</h2><p>Resin-coated sand has been the default answer to proppant flowback. SandWeb takes a different approach: treat the sand instead of replacing it.</p></div>
      <div className="sw-table-wrap"><table>
        <caption className="sw-sr">Comparison of SandWeb and resin-coated sand</caption>
        <thead><tr>{comparison.columns.map((column, index) => <th key={column || "feature"} scope="col" className={index === 1 ? "sw-col-hl" : undefined}>{column || <span className="sw-sr">Feature</span>}</th>)}</tr></thead>
        <tbody>{comparison.rows.map(([label, sandweb, rcs]) => <tr key={label}><th scope="row">{label}</th><td className="sw-col-hl">{sandweb}</td><td>{rcs}</td></tr>)}</tbody>
      </table></div>
    </section>

    <SavingsCalculator />

    <section className="sw-section sw-faq" aria-labelledby="sw-faq-title">
      <div className="sw-section-head"><span className="sw-kicker">FAQ</span><h2 id="sw-faq-title">SandWeb questions, answered</h2></div>
      <div className="sw-faq-list">{faqs.map((faq, index) => <details key={faq.question} open={index === 0}><summary>{faq.question}<ChevronDown size={18} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div>
    </section>

    <section className="sw-section sw-world" aria-labelledby="sw-world-title">
      <div className="sw-world-copy">
        <span className="sw-kicker"><Globe2 size={15} aria-hidden="true" /> Worldwide supply</span>
        <h2 id="sw-world-title">Shipped from Calgary to oilfields worldwide</h2>
        <p>Uniquem supplies SandWeb to operators and service companies around the world, for new fracs and producing wells alike. Pricing is quoted per application, so tell us about your wells and sand problem.</p>
        <dl><div><dt>Packaging</dt><dd>{product.packaging}</dd></div><div><dt>Applications</dt><dd>Hydraulic fracturing, well stimulation, remedial sand control</dd></div><div><dt>Availability</dt><dd>Worldwide</dd></div></dl>
        <div className="sw-actions"><Link className="sw-button" to="/contact-us">Request a SandWeb quote <ArrowUpRight size={17} /></Link></div>
      </div>
      <div className="sw-world-image"><img src={product.image} alt={product.alt} loading="lazy" /></div>
    </section>
    {inquiry}
  </main>;
}
