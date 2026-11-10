// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { buildTideFrame } from "./tide-texture";

vi.mock("react-native", () => ({ AccessibilityInfo: {}, AppState: {}, Text: {}, View: {} }));
vi.mock("expo-router", () => ({ useIsFocused: () => true }));
vi.mock("@/data/stores/texture-store", () => ({ useTextureStore: () => true }));
vi.mock("@/lib/theme", () => ({ THEME: {} }));
vi.mock("@/lib/use-color-scheme", () => ({ useColorScheme: () => ({}) }));


describe("buildTideFrame", () => {
  it("draws a cols x rows grid from the speck ramp only", () => {
    const frame = buildTideFrame(47, 30, 3);
    const lines = frame.split("\n");
    expect(lines).toHaveLength(30);
    expect(lines.every((line) => line.length === 47)).toBe(true);
    expect(/^[ ·∙\n]+$/.test(frame)).toBe(true);
  });

  it("keeps most cells empty so the texture stays quiet", () => {
    const frame = buildTideFrame(47, 40, 0).replace(/\n/g, "");
    const inked = frame.replace(/ /g, "").length;
    expect(inked).toBeGreaterThan(0);
    expect(inked / frame.length).toBeLessThan(0.45);
  });

  it("moves between frames", () => {
    expect(buildTideFrame(47, 30, 0)).not.toBe(buildTideFrame(47, 30, 8));
  });
});
