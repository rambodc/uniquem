// ─────────────────────────────────────────────────────────────────────────────
// SandWeb savings calculator: ALL NUMBERS HERE ARE PLACEHOLDERS.
//
// Every default input and every assumption below is an example value for
// illustration only. They are not field results, not quotes, and not Uniquem
// prices. Replace them with real figures when they are available. The page
// labels the calculator and charts "Example figures, for illustration only"
// using `SAVINGS_DISCLAIMER`.
// ─────────────────────────────────────────────────────────────────────────────

export const SAVINGS_DISCLAIMER = "Example figures, for illustration only";
export const SAVINGS_FOOTNOTE =
  "Defaults and improvement assumptions are placeholders, not SandWeb field results or pricing. Enter your own numbers, and contact Uniquem for an assessment based on your wells.";

export const CURRENCY = { code: "USD", locale: "en-US" } as const;

export type InputKey =
  | "wells"
  | "downtimeDays"
  | "productionRate"
  | "oilPrice"
  | "repairCost"
  | "workoversPerYear"
  | "workoverCost"
  | "treatmentCost";

export type InputField = { key: InputKey; label: string; hint?: string; min: number; max: number; step: number; defaultValue: number; unit?: string; money?: boolean };

/** Calculator inputs. `defaultValue` numbers are placeholders. */
export const SAVINGS_INPUTS: readonly InputField[] = [
  { key: "wells", label: "Number of wells", min: 1, max: 500, step: 1, defaultValue: 10 },
  { key: "downtimeDays", label: "Sand-related downtime per well", unit: "days/yr", min: 0, max: 180, step: 1, defaultValue: 10 },
  { key: "productionRate", label: "Production per well", unit: "bbl/day", min: 1, max: 5000, step: 1, defaultValue: 50 },
  { key: "oilPrice", label: "Oil price", unit: "$/bbl", min: 1, max: 200, step: 1, defaultValue: 70, money: true },
  { key: "repairCost", label: "Sand-related equipment repairs per well", unit: "$/yr", min: 0, max: 1000000, step: 1000, defaultValue: 25000, money: true },
  { key: "workoversPerYear", label: "Sand cleanouts / workovers per well", unit: "per yr", min: 0, max: 24, step: 0.5, defaultValue: 1 },
  { key: "workoverCost", label: "Cost per cleanout / workover", unit: "$", min: 0, max: 1000000, step: 1000, defaultValue: 30000, money: true },
  { key: "treatmentCost", label: "Treatment cost per well", hint: "Example value, not a Uniquem price. Use the figure from your quote.", unit: "$", min: 0, max: 1000000, step: 1000, defaultValue: 60000, money: true },
];

/** Improvement assumptions after treatment. Placeholders: replace with real data. */
export const SAVINGS_ASSUMPTIONS = {
  /** Share of sand-related downtime avoided. */
  downtimeReduction: 0.7,
  /** Share of sand-related equipment repair cost avoided. */
  repairReduction: 0.6,
  /** Share of sand cleanouts / workovers avoided. */
  workoverReduction: 0.7,
  /** Production uplift on producing days (0.05 = 5%). */
  productionUplift: 0.03,
  /** Years shown on the cumulative chart. */
  projectionYears: 3,
} as const;

export type SavingsInputs = Record<InputKey, number>;
export type Assumptions = Record<keyof typeof SAVINGS_ASSUMPTIONS, number>;

export const defaultSavingsInputs = (): SavingsInputs =>
  Object.fromEntries(SAVINGS_INPUTS.map((field) => [field.key, field.defaultValue])) as SavingsInputs;

export function calculateSavings(input: SavingsInputs, a: Assumptions = SAVINGS_ASSUMPTIONS) {
  const wells = Math.max(0, input.wells);
  const downtimeDays = Math.min(365, Math.max(0, input.downtimeDays));
  const dailyRevenue = input.productionRate * input.oilPrice;

  const before = {
    downtime: wells * downtimeDays * dailyRevenue,
    repairs: wells * input.repairCost,
    workovers: wells * input.workoversPerYear * input.workoverCost,
  };
  const after = {
    downtime: before.downtime * (1 - a.downtimeReduction),
    repairs: before.repairs * (1 - a.repairReduction),
    workovers: before.workovers * (1 - a.workoverReduction),
  };
  const recoveredDays = downtimeDays * a.downtimeReduction;
  const producingDays = 365 - downtimeDays + recoveredDays;
  const extraBarrels = wells * (recoveredDays * input.productionRate + producingDays * input.productionRate * a.productionUplift);
  const upliftRevenue = wells * producingDays * input.productionRate * a.productionUplift * input.oilPrice;

  const avoidedCosts = before.downtime - after.downtime + before.repairs - after.repairs + before.workovers - after.workovers;
  const annualSavings = avoidedCosts + upliftRevenue;
  const treatmentTotal = wells * input.treatmentCost;
  const paybackMonths = annualSavings > 0 ? (treatmentTotal / annualSavings) * 12 : Infinity;
  const months = a.projectionYears * 12;
  const cumulative = Array.from({ length: months + 1 }, (_, month) => (annualSavings / 12) * month - treatmentTotal);

  return { before, after, annualSavings, extraBarrels, upliftRevenue, treatmentTotal, paybackMonths, cumulative, netOverProjection: cumulative[months] };
}

export type SavingsResult = ReturnType<typeof calculateSavings>;
