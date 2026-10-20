// Visible copy for /chemicals/sandweb, shared with the FAQPage JSON-LD so the
// page and the structured data always say the same thing. Keep claims
// defensible and owner-approved: no invented statistics, customer names,
// certifications or "only product on the market" wording. The 90% figure is
// always footnoted "Reported in field frac treatments".

export const SANDWEB_EMAIL = "sandweb@uniquem.ca";
export const SANDWEB_PHONE_DISPLAY = "+1 403 390 0067";
export const SANDWEB_PHONE_TEL = "tel:+14033900067";
export const SANDWEB_PHONE_SCHEMA = "+1-403-390-0067";
export const FLOWBACK_FOOTNOTE = "*Reported in field frac treatments.";

export const sandwebSections = [
  {
    id: "how-it-works",
    title: "How SandWeb works",
    paragraphs: [
      "Loose sand and fines carry a surface charge that makes neighbouring grains repel each other. As fluid flows toward the wellbore, those grains break loose, plug pore throats and travel to surface. This is the root of sand production, proppant flowback and fines migration.",
      "SandWeb surrounds each grain and reverses the charge that drives grains apart. Instead of repelling, the grains draw together and hold as a stable, connected sand pack. There is no resin coating, and the pore spaces stay open, so the treatment controls sand without sealing the formation.",
    ],
  },
  {
    id: "applications",
    title: "Existing wells, stimulation and hydraulic fracturing",
    paragraphs: [
      "Existing wells: pump SandWeb as a stimulation or remedial sand control treatment on producing wells that already have sand or fines problems, without a new frac.",
      "Hydraulic fracturing: add SandWeb with the frac for proppant flowback control, using the sand and proppant you already pump instead of switching to specialty coated proppant.",
    ],
  },
] as const;

export const sandwebBenefits = [
  { title: "Sand flowback control", copy: "Holds sand and proppant downhole so less reaches pumps, chokes and flowlines. Up to 90% less sand flowback has been reported.*" },
  { title: "Fines migration control", copy: "Keeps fines from migrating and plugging pore throats near the wellbore." },
  { title: "Open pore spaces", copy: "No resin film on the grains, so oil and gas flow through a stable, connected sand pack." },
  { title: "Less wear and fewer cleanouts", copy: "Less abrasive sand at surface means less equipment wear, fewer cleanouts and less downtime." },
  { title: "More from existing wells", copy: "Treat producing wells that already have a sand problem and help bring them back to steady production." },
  { title: "Works with your proppant", copy: "Treat standard sand and proppant on location as a cost-effective alternative to resin-coated sand." },
] as const;

export const sandwebComparison = {
  columns: ["", "SandWeb", "Resin-coated sand"],
  rows: [
    ["What it is", "Liquid sand consolidation chemical", "Proppant pre-coated with resin at a plant"],
    ["How it holds sand", "Changes grain surface charge so grains attract", "Resin bonds coated grains together"],
    ["Existing producing wells", "Yes, as a stimulation or remedial treatment", "No, it is placed only during the frac"],
    ["Hydraulic fracturing", "Yes, pumped with the frac", "Yes, pumped as tail-in proppant"],
    ["Proppant", "Works with the sand and proppant you already use", "Requires specialty coated proppant"],
    ["Formation sand and fines", "Treats formation sand, fines and proppant", "Limited to the coated proppant"],
  ],
} as const;

export const sandwebFaqs = [
  { question: "What is SandWeb?", answer: "SandWeb is a liquid sand consolidation chemical from Uniquem. It changes the surface charge of sand, proppant and fines so the grains attract and hold together, controlling sand production while oil and gas keep flowing." },
  { question: "How does a sand consolidation chemical like SandWeb work?", answer: "Sand grains and fines naturally repel each other, so they break loose and migrate with produced fluids. SandWeb reverses the charge that drives them apart, so the grains draw together into a stable sand pack. There is no resin coating and the pore spaces stay open." },
  { question: "Can SandWeb be used on existing wells?", answer: "Yes. SandWeb can be pumped into existing producing wells as a stimulation or remedial sand control treatment, without a new frac." },
  { question: "Can SandWeb be used in hydraulic fracturing?", answer: "Yes. SandWeb can be pumped with the frac for proppant flowback control, using the sand and proppant you already use." },
  { question: "How is SandWeb different from resin-coated sand?", answer: "Resin-coated sand is a specialty proppant that has to be bought and placed during the frac. SandWeb is a liquid chemical that treats the sand already in the well or being pumped, can also be used on existing wells, and is designed as a cost-effective alternative to resin-coated sand." },
  { question: "How much can SandWeb reduce sand flowback?", answer: "Up to 90% less sand flowback has been reported in field frac treatments. Results depend on the well, so the SandWeb team can review your wells and discuss lab testing on your sand or core." },
  { question: "Is SandWeb available worldwide?", answer: "Yes. Uniquem is based in Calgary, Alberta and supplies SandWeb to operators and service companies worldwide. SandWeb is available in 1000 L totes." },
  { question: "How do I contact the SandWeb team?", answer: "Email sandweb@uniquem.ca or call +1 403 390 0067 to talk about your wells, pricing and lab testing." },
] as const;
