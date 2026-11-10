/**
 * Background texture: a slow "tide" of tiny glyphs.
 *
 * Two soft diagonal waves of dot density cross each other and travel up the
 * screen. A tone in [0, 1] per cell picks a glyph from a short ramp of the
 * smallest specks, so what is drawn is always real characters. A fixed
 * per-cell hash breaks up the wave edges; only the waves move, never the
 * grain, which keeps it from flickering.
 *
 * It is decoration and stays out of the way:
 *   - anchored to the bottom of its parent and thinned out toward its top
 *     edge, so it sits in the empty part of a screen and never under a header;
 *   - `pointerEvents="none"` and hidden from accessibility;
 *   - very low opacity (callers should not raise it past ~0.12);
 *   - still when the OS asks for reduced motion, and paused while the screen
 *     is unfocused or the app is in the background;
 *   - off entirely when the user turns it off in Settings.
 *
 * Place it as the FIRST child of a `flex-1` screen root (which must be
 * `relative`, the React Native default), so content paints above it.
 */
import { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  AppState,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useIsFocused } from "expo-router";
import { useTextureStore } from "@/data/stores/texture-store";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";

/** One glyph cell, in dp. JetBrains Mono advances 0.6em, so 10dp type plus
 *  4dp tracking makes the cell as wide as it is tall. */
const CELL = 10;
const TRACKING = 4;
const RAMP = " ··∙";
const FRAME_MS = 250;

interface Props {
  /** Height of the textured band, measured up from the parent's bottom. */
  height?: number;
  opacity?: number;
}

function hash(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

export function buildTideFrame(cols: number, rows: number, time: number): string {
  let out = "";
  for (let y = 0; y < rows; y++) {
    // Thin the texture out toward the top edge of the band.
    const fade = Math.min(1, (y + 1) / (rows * 0.45));
    for (let x = 0; x < cols; x++) {
      const u = x / 47;
      const v = y / 46;
      const w1 = Math.sin((u * 1.6 + v * 2.4) * 3.1 - time * 0.22);
      const w2 = Math.sin((u * -1.1 + v * 2.0) * 2.3 - time * 0.15 + 1.7);
      let tone = Math.max(0, (w1 + w2) * 0.5);
      tone = tone * tone * (0.55 + 0.45 * hash(x, y)) * fade;
      out += RAMP[Math.min(RAMP.length - 1, Math.floor(tone * RAMP.length))];
    }
    if (y < rows - 1) out += "\n";
  }
  return out;
}

export function TideTexture({ height = 420, opacity = 0.09 }: Props) {
  const enabled = useTextureStore((s) => s.enabled);
  const focused = useIsFocused();
  const { colorScheme } = useColorScheme();
  const [width, setWidth] = useState(0);
  const [tick, setTick] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (!cancelled) setReduceMotion(value);
    });
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    const app = AppState.addEventListener("change", (status) =>
      setAppActive(status === "active"),
    );
    return () => {
      cancelled = true;
      motion.remove();
      app.remove();
    };
  }, []);

  const running = enabled && focused && appActive && !reduceMotion && width > 0;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setTick((t) => t + 1), FRAME_MS);
    return () => clearInterval(timer);
  }, [running]);

  const cols = Math.ceil(width / CELL);
  const rows = Math.floor(height / CELL);
  const frame = useMemo(
    () => (cols > 0 ? buildTideFrame(cols, rows, tick * (FRAME_MS / 1000)) : ""),
    [cols, rows, tick],
  );

  if (!enabled) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event: LayoutChangeEvent) =>
        setWidth(event.nativeEvent.layout.width)
      }
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height,
        overflow: "hidden",
        opacity,
      }}
    >
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: CELL,
          lineHeight: CELL,
          letterSpacing: TRACKING,
          includeFontPadding: false,
          color: THEME[colorScheme].foreground,
        }}
      >
        {frame}
      </Text>
    </View>
  );
}
