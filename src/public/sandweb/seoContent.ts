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
      "Sand and fines naturally repel each other, so produced fluids carry them out of the formation, plugging pore throats and wearing surface equipment. SandWeb surrounds the sand grains and creates positive charges that bind them together in a web-like form. There is no resin coating and no formation damage, so the pore spaces stay open.",
      "SandWeb is used in stimulation treatments of existing producing wells and in hydraulic fracturing for proppant flowback control.",
    ],
  },
] as const;

export const sandwebBenefits = [
  { title: "Sand flowback control", copy: "Up to 90% less sand flowback." },
  { title: "Fines migration control", copy: "Keeps fines from plugging pore throats near the wellbore." },
  { title: "Open pore spaces", copy: "No resin coating, so oil and gas keep flowing." },
  { title: "Less wear and downtime", copy: "Fewer cleanouts and less wear on pumps and chokes." },
] as const;

export const sandwebComparison = {
  columns: ["", "SandWeb", "Resin-coated sand"],
  rows: [
    ["How it holds sand", "Charges bind grains in a web-like form", "Resin bonds coated grains"],
    ["Existing producing wells", "Yes, as a stimulation treatment", "No, frac only"],
    ["Proppant", "Works with the proppant you already use", "Specialty coated proppant"],
  ],
} as const;

export const sandwebFaqs = [
  { question: "What is SandWeb?", answer: "SandWeb is a liquid sand consolidation chemical from Uniquem. It surrounds sand grains and creates positive charges that bind them together in a web-like form, with no resin coating and no formation damage." },
  { question: "Where can SandWeb be used?", answer: "In stimulation treatments of existing producing wells and in hydraulic fracturing, with the sand and proppant you already use." },
  { question: "How much can SandWeb reduce sand flowback?", answer: "Operators have seen up to 90% less sand flowback. Results vary by well." },
  { question: "Is SandWeb available worldwide?", answer: "Yes. Uniquem supplies SandWeb worldwide from Calgary, Alberta, in 1000 L totes." },
] as const;

// Short on-page summary of the narrated presentation (the full narration lives
// in presentation/narration.ts and is shown as captions in the player).
export const presentationSummary = [
  { id: "problem", title: "The hidden cost of sand", text: "As fluid flows to the wellbore, it carries sand and fines that plug the formation, wear down pumps and chokes, force cleanouts and cut production." },
  { id: "sandweb", title: "SandWeb changes the charge", text: "Pumped into an existing well or with the frac, SandWeb surrounds each grain and reverses the charge that drives grains apart, so they hold together. No resin coating, no formation damage, and the pore spaces stay open." },
  { id: "result", title: "Sand stays down. Oil flows.", text: "Oil flows freely through a stable sand pack, with up to 90% less sand flowback, less equipment wear and fewer cleanouts." },
  { id: "ending", title: "Let's talk about your wells", text: "More production, less sand, less downtime and lower costs." },
] as const;
