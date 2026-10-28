import type { ReactNode } from "react";
import type { Guest } from "../core/api";
import { groupChips, inGroup, letterSections } from "./logic";

/** Browse all: group chips (from the data), everyone A–Z by first name in letter sections, and a jump rail on the right. */
export default function DoorBrowse({ guests, group, onGroup, renderRow }: { guests: Guest[]; group: string | null; onGroup: (key: string | null) => void; renderRow: (guest: Guest) => ReactNode }) {
  const chips = groupChips(guests), sections = letterSections(guests.filter((guest) => inGroup(guest, group)));
  const jump = (letter: string) => document.getElementById(`door-letter-${letter === "#" ? "other" : letter}`)?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  return <div className="ws-browse-wrap">
    {chips.length > 0 && <div className="ws-chips" role="group" aria-label="Filter by Invited by / Type">
      <button className={`ws-filter${group === null ? " on" : ""}`} aria-pressed={group === null} onClick={() => onGroup(null)}>All <small>{guests.length}</small></button>
      {chips.map((chip) => <button key={chip.key} className={`ws-filter${group === chip.key ? " on" : ""}`} aria-pressed={group === chip.key} onClick={() => onGroup(group === chip.key ? null : chip.key)}>{chip.label} <small>{chip.count}</small></button>)}
    </div>}
    {sections.length === 0 ? <div className="ws-empty">No guests here yet.</div> : <div className="ws-browse">
      <div className="ws-browse-list">{sections.map((section) => <section key={section.letter} id={`door-letter-${section.letter === "#" ? "other" : section.letter}`} className="ws-letter-section" aria-label={`Guests starting with ${section.letter}`}>
        <h3 className="ws-letter">{section.letter}</h3><ul className="ws-door-list">{section.guests.map(renderRow)}</ul></section>)}</div>
      <nav className="ws-rail" aria-label="Jump to letter">{sections.map((section) => <button key={section.letter} onClick={() => jump(section.letter)} aria-label={`Jump to ${section.letter}`}>{section.letter}</button>)}</nav>
    </div>}
  </div>;
}
