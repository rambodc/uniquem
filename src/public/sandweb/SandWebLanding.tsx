import { ArrowUp, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { findPublicProduct } from "../products";
import SandWebPresentation from "./presentation/SandWebPresentation";
import { presentationSummary, sandwebBenefits, sandwebComparison, sandwebFaqs, sandwebSections } from "./seoContent";

/** /chemicals/sandweb: the narrated presentation fills the first screen; the
 * short product information and presentation summary follow below it as normal content. */
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
          <li><b>Where</b> Stimulation of existing producing wells and hydraulic fracturing</li>
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
      </section>

      <section className="sw-block" id="vs-resin-coated-sand">
        <h2>SandWeb vs resin-coated sand</h2>
        <div className="sw-table-wrap"><table>
          <thead><tr>{sandwebComparison.columns.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>
          <tbody>{sandwebComparison.rows.map((row) => <tr key={row[0]}><th scope="row">{row[0]}</th><td>{row[1]}</td><td>{row[2]}</td></tr>)}</tbody>
        </table></div>
      </section>

      <section className="sw-block" id="transcript">
        <h2>Presentation summary</h2>
        {presentationSummary.map((part, i) => <div className="sw-transcript" key={part.id}><h3>{String(i + 1).padStart(2, "0")} · {part.title}</h3><p>{part.text}</p></div>)}
      </section>

      <section className="sw-block" id="faq">
        <h2>SandWeb FAQ</h2>
        <div className="sw-faq">{sandwebFaqs.map((f) => <div key={f.question}><h3>{f.question}</h3><p>{f.answer}</p></div>)}</div>
      </section>

      <section className="sw-block sw-contact-block" id="contact">
        <h2>Available worldwide</h2>
        <p>Uniquem supplies SandWeb to operators and service companies around the world. Talk to us about your wells and lab testing on your sand.</p>
        <div className="sw-contact-links">
          <Link to="/contact-us">Contact Uniquem <ArrowUpRight size={16} /></Link>
        </div>
        <p className="sw-more"><a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}><ArrowUp size={15} /> Back to the presentation</a><Link to="/chemicals">All Uniquem chemicals</Link><Link to="/">Uniquem home</Link></p>
      </section>
    </article>
  </main>;
}
