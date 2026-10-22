// Visible copy for /chemicals/sandweb, shared with the FAQPage JSON-LD so the
// page and the structured data always say the same thing. Keep it short and
// defensible: no invented statistics, customer names, certifications or
// "only product on the market" wording.
// SandWeb contact details (email and phone) belong ONLY in the presentation's
// "I'll reach out" panel (presentation/Ending.tsx); check-seo enforces this.

export const sandwebSections = [
  {
    id: "how-it-works",
    title: "How SandWeb works",
    paragraphs: [
      "As fluid flows to the wellbore, sand and fines disperse in it. They either plug pore throats in the formation or travel to surface, wearing pumps and chokes. SandWeb surrounds each grain to increase the friction between sand particles. Instead of dispersing, the particles consolidate into a web, while the chemical impact on reservoir permeability is kept to a minimum.",
      "SandWeb is used in stimulation treatments of existing producing wells and in hydraulic fracturing for proppant flowback control.",
    ],
  },
] as const;

export const sandwebBenefits = [
  { title: "Sand flowback control", copy: "Operators have seen up to 90% less sand flowback." },
  { title: "Fines migration control", copy: "Keeps fines from plugging pore throats near the wellbore." },
  { title: "Flow preserved", copy: "Minimal chemical impact on reservoir permeability, so oil and gas keep flowing." },
  { title: "Less wear and downtime", copy: "Fewer cleanouts and less wear on pumps and chokes." },
] as const;

export const sandwebComparison = {
  columns: ["", "SandWeb", "Resin-coated sand"],
  rows: [
    ["How it holds sand", "Increases friction between grains to form a web", "Resin bonds coated grains"],
    ["Existing producing wells", "Yes, as a stimulation treatment", "No, frac only"],
    ["Proppant", "Works with the proppant you already use", "Specialty coated proppant"],
  ],
} as const;

export const sandwebFaqs = [
  { question: "What is SandWeb?", answer: "SandWeb is a liquid sand consolidation chemical from Uniquem. It surrounds each sand grain to increase the friction between particles, so instead of dispersing they consolidate into a web, while minimizing the chemical impact on reservoir permeability." },
  { question: "Where can SandWeb be used?", answer: "In stimulation treatments of existing producing wells and in hydraulic fracturing, with the sand and proppant you already use." },
  { question: "How much can SandWeb reduce sand flowback?", answer: "Operators have seen up to 90% less sand flowback. Results vary by well." },
  { question: "Is SandWeb available worldwide?", answer: "Yes. Uniquem supplies SandWeb worldwide from Calgary, Alberta, in 1000 L totes." },
] as const;

// Short on-page summary of the narrated presentation (the full narration lives
// in presentation/narration.ts and is shown as captions in the player).
export const presentationSummary = [
  { id: "problem", title: "The hidden cost of sand", text: "As fluid flows to the wellbore, it carries sand and fines that disperse in the fluid and either plug the pore throats in the formation or travel to surface, wearing down pumps and chokes, forcing cleanouts and cutting production." },
  { id: "sandweb", title: "SandWeb changes the charge", text: "Pumped into an existing well as part of a stimulation package, or with the frac fluid, SandWeb surrounds each grain to increase the friction between sand particles. Instead of dispersing, the particles are consolidated into a web while minimizing the chemical impact on reservoir permeability." },
  { id: "result", title: "Sand stays down. Oil flows.", text: "The well can produce at its maximum potential. Oil flows freely through a stable, connected sand pack, with up to 90% less sand flowback, less equipment wear, fewer cleanouts and more production." },
] as const;
