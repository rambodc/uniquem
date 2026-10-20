// Prebuilt branching questionnaire for the SandWeb presentation (no AI).
export type QuestionId = "sand" | "work" | "wells" | "region";
export type Option = { value: string; label: string };
export type Question = { id: QuestionId; scene: "q1" | "q2" | "q3" | "q4"; title: string; options: readonly Option[] };

export const questions: readonly Question[] = [
  { id: "sand", scene: "q1", title: "Is sand or fines production affecting any of your wells?", options: [{ value: "major", label: "Yes, it's a major issue" }, { value: "sometimes", label: "Sometimes" }, { value: "unsure", label: "Not sure" }] },
  { id: "work", scene: "q2", title: "What are you working with?", options: [{ value: "producing", label: "Producing wells" }, { value: "fracs", label: "Upcoming fracs" }, { value: "both", label: "Both" }] },
  { id: "wells", scene: "q3", title: "How many wells could benefit?", options: [{ value: "1-5", label: "1-5" }, { value: "6-20", label: "6-20" }, { value: "21-50", label: "21-50" }, { value: "50+", label: "50+" }] },
  { id: "region", scene: "q4", title: "Where are your wells?", options: [{ value: "canada", label: "Western Canada" }, { value: "us", label: "United States" }, { value: "middleeast", label: "Middle East" }, { value: "elsewhere", label: "Elsewhere" }] },
];

export const warningSigns = ["Rising pump failures", "Choke or flowline erosion", "Frequent cleanouts", "Declining rates"];

export type Answers = Partial<Record<QuestionId, string>>;
const label = (id: QuestionId, value?: string) => questions.find((q) => q.id === id)?.options.find((o) => o.value === value)?.label ?? "Not answered";

/** Personalized summary, using only defensible wording. */
export function summarize(a: Answers) {
  const work = a.work === "fracs" ? "upcoming fracs" : a.work === "both" ? "producing wells and upcoming fracs" : "producing wells";
  const count = a.wells ?? "";
  const subject = a.work === "fracs" ? `Your ${count} upcoming fracs` : a.work === "both" ? `Your ${count} producing wells and upcoming fracs` : `Your ${count} producing wells`;
  const fit = a.sand === "unsure" ? "could be worth a closer look for SandWeb" : "look like a strong fit for SandWeb";
  const points: string[] = [];
  if (a.work !== "fracs") points.push("On producing wells, SandWeb is pumped in to help hold sand and fines in place near the wellbore.");
  if (a.work !== "producing") points.push("Pumped with the frac, SandWeb helps keep proppant in the fracture during flowback.");
  points.push(a.region === "canada" ? "SandWeb is field-proven in Western Canada fracs, and our team is based in Calgary." : "Uniquem ships SandWeb from Calgary to oilfields worldwide.");
  points.push("A free lab test on your sand or core is available, so you can see how SandWeb performs on your rock.");
  return { headline: `${subject} ${fit}.`, work, points };
}

export function leadMessage(a: Answers, preview: boolean) {
  const lines = questions.map((q) => `${q.title} ${label(q.id, a[q.id])}`);
  return `${preview ? "[PREVIEW TEST - not a real lead] " : ""}SandWeb presentation questionnaire\n\n${lines.join("\n")}\n\nSummary shown: ${summarize(a).headline}\nRequested: pricing and next steps (free lab test offered).`;
}
