import { describe, expect, it } from "vitest";
import { activityByDay, brailleTrace } from "./board";

// Local noon in mid-June: far from any DST change, so day arithmetic in the
// fixtures below is exact in every timezone.
const NOW = new Date(2026, 5, 15, 12, 0, 0);
const at = (daysAgo: number, hour = 12) => ({
  updated_at: new Date(2026, 5, 15 - daysAgo, hour, 0, 0).toISOString(),
});

describe("activityByDay", () => {
  it("buckets by local calendar day, oldest first, today last", () => {
    const counts = activityByDay(
      [at(0, 0), at(0, 23), at(1, 23), at(11, 0), at(3), at(3), at(3)],
      NOW,
    );
    expect(counts).toHaveLength(12);
    expect(counts[11]).toBe(2);
    expect(counts[10]).toBe(1);
    expect(counts[8]).toBe(3);
    expect(counts[0]).toBe(1);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(7);
  });

  it("skips rows outside the window, in the future, or unparseable", () => {
    const counts = activityByDay(
      [at(12, 23), at(40), at(-1, 1), { updated_at: "" }, { updated_at: "x" }],
      NOW,
    );
    expect(counts.every((count) => count === 0)).toBe(true);
  });
});

describe("brailleTrace", () => {
  it("is empty when there was no activity", () => {
    expect(brailleTrace([])).toBe("");
    expect(brailleTrace(new Array(12).fill(0))).toBe("");
  });

  it("packs two days per glyph, scaled to the busiest day", () => {
    // max 8 → levels 0,4 | 1,2 | 3,0
    expect(brailleTrace([0, 8, 1, 4, 6, 0])).toBe(
      String.fromCharCode(0x2800 + 0xb8, 0x2800 + 0x40 + 0xa0, 0x2800 + 0x46),
    );
  });

  it("never rounds a day with activity down to nothing", () => {
    expect(brailleTrace([1, 100])).toBe(
      String.fromCharCode(0x2800 + 0x40 + 0xb8),
    );
  });

  it("handles an odd number of days", () => {
    expect(brailleTrace([2, 2, 2])).toBe(
      String.fromCharCode(0x2800 + 0x47 + 0xb8, 0x2800 + 0x47),
    );
  });
});
