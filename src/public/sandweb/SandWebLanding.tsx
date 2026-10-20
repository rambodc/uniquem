import { ArrowUp, ArrowUpRight, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { findPublicProduct } from "../products";
import SandWebPresentation from "./presentation/SandWebPresentation";
import { endingClip, narratedScenes } from "./presentation/narration";
import { FLOWBACK_FOOTNOTE, SANDWEB_EMAIL, SANDWEB_PHONE_DISPLAY, SANDWEB_PHONE_TEL, sandwebBenefits, sandwebComparison, sandwebFaqs, sandwebSections } from "./seoContent";

// The transcript is generated from the narration captions, so it always
// mirrors the spoken presentation word for word.
const transcript = [
  ...narratedScenes.map((scene) => ({ id: scene.id, title: scene.title, text: scene.captions.map((c) => c.text).join(" ") })),
  { id: "ending", title: "Let's talk about your wells", text: endingClip.captions.map((c) => c.text).join(" ") },
];

/** /chemicals/sandweb: the narrated presentation fills the first screen; the
 * full product information and transcript follow below it as normal content. */
export default function SandWebLanding() {
  const product = findPublicProduct("/chemicals/sandweb")!;
  return <main className="sw-landing">
    <SandWebPresentation />
    <article className="sw-about" id="about-sandweb" aria-labelledby="about-sandweb-title">
      <nav className="sw-crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/chemicals">Chemicals</Link><span>/</span><span>SandWeb</span></nav>
      <header className="sw-about-head">
        <span className="sw-kicker">About SandWeb</span>
        <h2 id="about-sandweb-title">Sand control chemistry for existing wells and fracs</h2>
        <p className="sw-lede">{product.description}</p>
        <ul className="sw-facts">
          <li><b>Use</b> Sand consolidation, sand flowback control, proppant flowback control, fines migration control</li>
          <li><b>Where</b> Existing producing wells (stimulation and remedial) and hydraulic fracturing</li>
          <li><b>Supply</b> {product.packaging}, shipped worldwide from Calgary, Alberta</li>
        </ul>
      </header>

      {sandwebSections.map((section) => <section className="sw-block" key={section.id} id={section.id}>
        <h2>{section.title}</h2>
        {section.paragraphs.map((p) => <p key={p}>{p}</p>)}
      </section>)}

      <section className="sw-block" id="benefits">
        <h2>Benefits of SandWeb</h2>
        <div className="sw-benefit-grid">{sandwebBenefits.map((b) => <div key={b.title}><h3>{b.title}</h3><p>{b.copy}</p></div>)}</div>
        <p className="sw-note">{FLOWBACK_FOOTNOTE}</p>
      </section>

      <section className="sw-block" id="vs-resin-coated-sand">
        <h2>SandWeb vs resin-coated sand</h2>
        <p>Looking for a resin-coated sand alternative? SandWeb treats the sand and proppant you already use, and it can also treat existing wells.</p>
        <div className="sw-table-wrap"><table>
          <thead><tr>{sandwebComparison.columns.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>
          <tbody>{sandwebComparison.rows.map((row) => <tr key={row[0]}><th scope="row">{row[0]}</th><td>{row[1]}</td><td>{row[2]}</td></tr>)}</tbody>
        </table></div>
      </section>

      <section className="sw-block" id="transcript">
        <h2>Presentation transcript</h2>
        {transcript.map((part, i) => <div className="sw-transcript" key={part.id}><h3>{String(i + 1).padStart(2, "0")} · {part.title}</h3><p>{part.text}</p></div>)}
        <p className="sw-note">{FLOWBACK_FOOTNOTE}</p>
      </section>

      <section className="sw-block" id="faq">
        <h2>SandWeb FAQ</h2>
        <div className="sw-faq">{sandwebFaqs.map((f) => <div key={f.question}><h3>{f.question}</h3><p>{f.answer}</p></div>)}</div>
      </section>

      <section className="sw-block sw-contact-block" id="contact">
        <h2>Available worldwide</h2>
        <p>Uniquem is based in Calgary, Alberta and supplies SandWeb to operators and service companies around the world. Talk to the SandWeb team about your wells, pricing and lab testing on your sand or core.</p>
        <div className="sw-contact-links">
          <a href={`mailto:${SANDWEB_EMAIL}?subject=${encodeURIComponent("SandWeb")}`}><Mail size={18} /> {SANDWEB_EMAIL}</a>
          <a href={SANDWEB_PHONE_TEL}><Phone size={18} /> {SANDWEB_PHONE_DISPLAY}</a>
          <Link to="/contact-us">Contact Uniquem <ArrowUpRight size={16} /></Link>
        </div>
        <p className="sw-more"><a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}><ArrowUp size={15} /> Back to the presentation</a><Link to="/chemicals">All Uniquem chemicals</Link><Link to="/">Uniquem home</Link></p>
      </section>
    </article>
  </main>;
}
