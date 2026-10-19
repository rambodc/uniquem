// Copy for the SandWeb product page. Kept in one place so the visible page,
// the 3D captions, and the FAQPage JSON-LD always say the same thing.
// Only owner-approved claims belong here: no invented statistics, customer
// names, certifications, or trial results.

export type StoryStep = {
  id: string;
  kicker: string;
  title: string;
  copy: string;
  /** Qualitative HUD levels (0 to 1) for the 3D overlay. Not measurements. */
  hud: { production: number; sand: number; wear: number };
  depth: string;
};

export const storySteps: readonly StoryStep[] = [
  {
    id: "wellsite",
    kicker: "01 · The wellsite",
    title: "Sand consolidation chemistry that keeps sand where it belongs",
    copy: "SandWeb is a liquid sand consolidation chemical from Uniquem. It binds proppant and formation sand into a stable, permeable web, so oil and gas keep flowing while sand stays downhole. Scroll to follow a well from the surface to the fracture.",
    hud: { production: 0.7, sand: 0.15, wear: 0.15 },
    depth: "Surface",
  },
  {
    id: "wellbore",
    kicker: "02 · Down the wellbore",
    title: "Through the strata to the producing zone",
    copy: "The wellbore drops through layers of rock, then turns horizontal through the reservoir. Perforations in the casing connect the well to the formation, and this is where sand control starts or fails.",
    hud: { production: 0.7, sand: 0.15, wear: 0.15 },
    depth: "Vertical section",
  },
  {
    id: "fractures",
    kicker: "03 · Fractures propped open",
    title: "Proppant holds the fractures open",
    copy: "During hydraulic fracturing, sand and proppant are pumped into the fractures to hold them open, creating a conductive path for hydrocarbons. On their own, those grains are loose.",
    hud: { production: 0.85, sand: 0.2, wear: 0.15 },
    depth: "Horizontal section",
  },
  {
    id: "flowback",
    kicker: "04 · The problem: sand flowback",
    title: "Loose sand flows back and wears out the well",
    copy: "As the well produces, loose proppant and formation sand migrate back into the wellbore. Sand erodes pumps, chokes and flowlines, fills the wellbore, forces cleanouts and workovers, and production drops.",
    hud: { production: 0.3, sand: 0.95, wear: 0.95 },
    depth: "Whole well",
  },
  {
    id: "treatment",
    kicker: "05 · SandWeb treatment",
    title: "SandWeb is pumped in and binds the grains together",
    copy: "SandWeb can be added during the fracture treatment or pumped later as a stimulation or remedial treatment on a producing well. It reaches the sand pack and bonds grain to grain, building a consolidated web.",
    hud: { production: 0.55, sand: 0.4, wear: 0.4 },
    depth: "Treatment zone",
  },
  {
    id: "producing",
    kicker: "06 · Sand locked, well producing",
    title: "Oil and gas flow. The sand stays put.",
    copy: "With the sand pack held in place, hydrocarbons flow through the open pore space while sand stays downhole. That means less erosion, fewer cleanouts, less downtime and steadier production.",
    hud: { production: 1, sand: 0.08, wear: 0.1 },
    depth: "Producing",
  },
];

export const applications = [
  {
    title: "Hydraulic fracturing",
    copy: "Add SandWeb to the frac to consolidate the proppant pack as it is placed. It provides proppant flowback control with the sand you already pump, without switching to specialty coated proppant.",
    points: ["Proppant flowback control", "Works with your existing proppant", "Supports fracture-treatment stability"],
  },
  {
    title: "Well stimulation and remedial treatments",
    copy: "Pump SandWeb into existing producing wells that already have a sand problem. It consolidates formation sand and proppant near the wellbore to restore sand control, without a new frac.",
    points: ["Remedial sand control for producing wells", "Stimulation treatments", "Helps bring sand-troubled wells back to steady production"],
  },
] as const;

export const benefits = [
  { title: "Sand control", copy: "Consolidates proppant and formation sand into a stable web to control sand flowback and sand production." },
  { title: "Protects equipment", copy: "Keeps abrasive sand out of pumps, chokes, valves and flowlines, which are among the first things sand destroys." },
  { title: "Less maintenance", copy: "Fewer sand cleanouts, workovers and equipment change-outs means more time producing and less time on repairs." },
  { title: "More production", copy: "With the sand pack held in place, fractures stay conductive and wells keep producing instead of choking back or shutting in." },
  { title: "Cost-effective alternative to resin-coated sand", copy: "Treat standard proppant on location instead of buying premium resin-coated sand, and use the same chemistry for remedial work." },
  { title: "Proven in the field", copy: "SandWeb has been proven across many field trials, where it has saved clients significant money in production, equipment and sand control." },
] as const;

export const comparison = {
  columns: ["", "SandWeb", "Resin-coated sand"],
  rows: [
    ["What it is", "Liquid sand consolidation chemistry", "Proppant pre-coated with resin at a plant"],
    ["Proppant", "Works with the sand and proppant you already use", "Requires purchasing specialty coated proppant"],
    ["Fracturing", "Yes, added during the frac for proppant flowback control", "Yes, pumped as the tail-in proppant"],
    ["Remedial use on producing wells", "Yes, as a stimulation or remedial sand control treatment", "No, it can only be placed during the frac"],
    ["Formation sand", "Consolidates both proppant and formation sand", "Limited to the coated proppant itself"],
    ["Logistics", "Shipped in 1000 L totes, worldwide", "Bulk specialty proppant supply chain"],
    ["Cost", "Designed as a cost-effective alternative", "Premium-priced proppant"],
  ],
} as const;

export const faqs = [
  { question: "What is SandWeb?", answer: "SandWeb is a sand consolidation chemical from Uniquem. It binds proppant and formation sand grains together into a stable, permeable web so hydrocarbons can flow while the sand stays downhole." },
  { question: "Can SandWeb be used for both hydraulic fracturing and well stimulation?", answer: "Yes. SandWeb can be added during hydraulic fracturing for proppant flowback control, and it can be pumped as a stimulation or remedial treatment on existing producing wells that already have sand production." },
  { question: "How is SandWeb different from resin-coated sand?", answer: "Resin-coated sand is a specialty proppant that has to be bought and pumped during the frac. SandWeb is a liquid chemistry that treats the sand you already use, can also be applied remedially to producing wells, and is designed as a cost-effective alternative to resin-coated sand." },
  { question: "What problems does sand flowback cause?", answer: "Sand flowback erodes pumps, chokes, valves and flowlines, fills the wellbore, and leads to cleanouts, workovers, downtime and lost production. Sand flowback control protects both the equipment and the well's output." },
  { question: "Has SandWeb been proven in the field?", answer: "Yes. SandWeb has been proven across many field trials, where it has saved clients significant money in production, equipment and sand control and has increased production. Contact Uniquem to discuss results for applications like yours." },
  { question: "Is SandWeb available outside Canada?", answer: "Yes. Uniquem is based in Calgary, Alberta and supplies SandWeb to operators and service companies worldwide. It is available in 1000 L totes." },
  { question: "How much could SandWeb save on my wells?", answer: "Savings depend on your wells, sand problems, equipment and production. Use the example calculator on this page to explore the drivers, then contact Uniquem so our team can review your data and quote an application." },
] as const;
