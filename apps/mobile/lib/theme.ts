/**
 * TypeScript mirror of the CSS variables defined in apps/mobile/global.css.
 *
 * - `THEME` is the raw token object for inline styles, animations, and
 *   anywhere a Tailwind class can't reach.
 * - `NAV_THEME` is the React Navigation theme — passed into <ThemeProvider />
 *   in app/_layout.tsx so headers, modals, and the back button match.
 *
 * If you change a variable in global.css, update the matching key here.
 * See apps/mobile/AGENTS.md, "Theming model", for the sync rule.
 */
import { DarkTheme, DefaultTheme, type Theme } from "expo-router";

export const THEME = {
  light: {
    background: "hsl(0 0% 100%)",
    foreground: "hsl(0 0% 3.9%)",
    card: "hsl(0 0% 100%)",
    cardForeground: "hsl(0 0% 3.9%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(0 0% 3.9%)",
    primary: "hsl(11 82% 45%)",
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(0 0% 96.1%)",
    secondaryForeground: "hsl(0 0% 9%)",
    muted: "hsl(0 0% 96.1%)",
    mutedForeground: "hsl(0 0% 45.1%)",
    accent: "hsl(0 0% 96.1%)",
    accentForeground: "hsl(0 0% 9%)",
    destructive: "hsl(0 84.2% 60.2%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(0 0% 89.8%)",
    input: "hsl(0 0% 89.8%)",
    ring: "hsl(11 82% 45%)",
    radius: "0.625rem",
    chart1: "hsl(12 76% 61%)",
    chart2: "hsl(173 58% 39%)",
    chart3: "hsl(197 37% 24%)",
    chart4: "hsl(43 74% 66%)",
    chart5: "hsl(27 87% 67%)",

    // Multica custom
    brand: "hsl(11 82% 45%)",
    brandForeground: "hsl(0 0% 100%)",
    success: "hsl(142 71% 45%)",
    warning: "hsl(48 89% 47%)",
    info: "hsl(217 91% 60%)",
    priority: "hsl(25 95% 53%)",
    codeSurface: "hsl(240 4% 92%)",
    // Surface elevation tiers — see global.css for the full scale.
    surface1: "hsl(0 0% 98%)",
    surface2: "hsl(0 0% 90%)",
  },
  dark: {
    background: "hsl(0 0% 3.9%)",
    foreground: "hsl(0 0% 92%)",
    card: "hsl(0 0% 7.5%)",
    cardForeground: "hsl(0 0% 92%)",
    popover: "hsl(0 0% 7.5%)",
    popoverForeground: "hsl(0 0% 92%)",
    primary: "hsl(11 87% 62%)",
    primaryForeground: "hsl(12 56% 7%)",
    secondary: "hsl(0 0% 12%)",
    secondaryForeground: "hsl(0 0% 92%)",
    muted: "hsl(0 0% 12%)",
    mutedForeground: "hsl(0 0% 65%)",
    accent: "hsl(0 0% 12%)",
    accentForeground: "hsl(0 0% 92%)",
    destructive: "hsl(11 100% 72%)",
    destructiveForeground: "hsl(0 0% 98%)",
    border: "hsl(0 0% 14.5%)",
    input: "hsl(0 0% 17%)",
    ring: "hsl(11 87% 62%)",
    radius: "0.625rem",
    chart1: "hsl(220 70% 50%)",
    chart2: "hsl(160 60% 45%)",
    chart3: "hsl(30 80% 55%)",
    chart4: "hsl(280 65% 60%)",
    chart5: "hsl(340 75% 55%)",

    // Multica custom — dark mirrors light until demand
    brand: "hsl(11 87% 62%)",
    brandForeground: "hsl(12 56% 7%)",
    success: "hsl(142 71% 45%)",
    warning: "hsl(48 89% 47%)",
    info: "hsl(217 91% 60%)",
    priority: "hsl(25 95% 53%)",
    // code-surface is the ONE exception that needs a real dark value —
    // see global.css for rationale. Keep this in sync with .dark:root.
    codeSurface: "hsl(0 0% 7.5%)",
    // Dark elevation tiers — lightness INCREASES with elevation. See global.css.
    surface1: "hsl(0 0% 7.5%)",
    surface2: "hsl(0 0% 16%)",
  },
};

export const NAV_THEME: Record<"light" | "dark", Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      // Navigation's `card` paints the native header; it should be the page,
      // not the raised panel colour.
      card: THEME.light.background,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.background,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
