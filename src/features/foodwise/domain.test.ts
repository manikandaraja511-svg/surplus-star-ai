import { describe, it, expect } from "vitest";
import {
  testCases,
  estimate,
  defaultSettings,
  settingsSchema,
  sampleRecords,
  exportCSV,
  historicalDemand,
} from "./domain";
describe("FoodWise food-management rules", () => {
  for (const test of testCases) it(test.name, () => expect(test.run()).toBe(test.expected));
  it("uses configurable 10% and 25% demonstration thresholds", () => {
    const r = sampleRecords()[0];
    if (!r) throw new Error("Missing fixture");
    expect(estimate({ ...r, prepared: 100, demand: 90 }, defaultSettings).level).toBe("Moderate");
    expect(estimate({ ...r, prepared: 100, demand: 75 }, defaultSettings).level).toBe("High");
  });
  it("rejects inverted thresholds", () =>
    expect(settingsSchema.safeParse({ moderate: 30, high: 20, expiryHours: 24 }).success).toBe(
      false,
    ));
  it("does not mix historical units or use the target record", () =>
    expect(historicalDemand("Rice", "kg", sampleRecords()).demand).toBe(null));
  it("labels all 24 sample rows simulated", () => {
    const r = sampleRecords();
    expect(r).toHaveLength(24);
    expect(r.every((x) => x.simulated)).toBe(true);
  });
  it("escapes CSV formulas and quotes", () => {
    const r = sampleRecords()[0];
    if (!r) throw new Error("Missing fixture");
    expect(exportCSV([{ ...r, name: "=SUM(1,2)", notes: 'a "quote"' }], [])).toContain(
      '"\'=SUM(1,2)"',
    );
    expect(exportCSV([{ ...r, notes: 'a "quote"' }], [])).toContain('"a ""quote"""');
  });
});
