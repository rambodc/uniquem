import { describe, expect, it } from "vitest";
import { calculateSavings, defaultSavingsInputs } from "./savingsConfig";

describe("SandWeb example savings calculator", () => {
  it("derives savings, payback and the cumulative curve from the inputs", () => {
    const inputs = { ...defaultSavingsInputs(), wells: 1, downtimeDays: 10, productionRate: 100, oilPrice: 50, repairCost: 10000, workoversPerYear: 1, workoverCost: 20000, treatmentCost: 12000 };
    const assumptions = { downtimeReduction: 0.5, repairReduction: 0.5, workoverReduction: 0.5, productionUplift: 0, projectionYears: 1 };
    const result = calculateSavings(inputs, assumptions);
    expect(result.annualSavings).toBe(25000 + 5000 + 10000);
    expect(result.extraBarrels).toBe(500);
    expect(result.paybackMonths).toBeCloseTo(3.6);
    expect(result.cumulative[0]).toBe(-12000);
    expect(result.cumulative).toHaveLength(13);
  });
  it("never reports a payback when nothing is saved", () => {
    const result = calculateSavings({ ...defaultSavingsInputs(), downtimeDays: 0, repairCost: 0, workoversPerYear: 0 }, { downtimeReduction: 0, repairReduction: 0, workoverReduction: 0, productionUplift: 0, projectionYears: 1 });
    expect(result.paybackMonths).toBe(Infinity);
  });
});
