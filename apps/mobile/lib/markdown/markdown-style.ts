/**
 * `markdownStyle` prop value for `EnrichedMarkdownText`. Driven by RNR
 * theme tokens (`apps/mobile/lib/theme.ts`, mirroring CSS variables in
 * `apps/mobile/global.css`) so colors track light/dark automatically.
 *
 * Why a hook instead of a static object: enriched-markdown is a native
 * (md4c → NSAttributedString / Spannable) layer that only accepts an
 * imperative style object — it can NOT consume NativeWind classNames.
 * The hook is the bridge: it reads the current colorScheme via the same
 * `useColorScheme` everything else in the app uses, and rebuilds the
 * style object whenever the theme flips.
 *
 * Type follows DESIGN.md ("Graphite"): Schibsted Grotesk for prose, JetBrains
 * Mono for code, body 15/23. The values are encoded in the `MD_FONT` /
 * `MD_LINE` / `MD_GAP` constants below. Every colour comes from
 * `THEME[scheme]`; see docs/markdown-rendering-adr.md for why no colour field
 * may be left to the library default.
 */
import { useMemo } from "react";
import { MOBILE_RADIUS } from "@/lib/radius";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";

/**
 * Families registered by the expo-font plugin (app.config.ts). The native
 * layer resolves `fontFamily` + `fontWeight` to the real cut, so headings ask
 * for 600 and get the SemiBold file instead of a synthesised bold.
 */
const SANS_FONT = "Schibsted Grotesk";
const MONO_FONT = "JetBrains Mono";

/**
 * Type scale from DESIGN.md: body 15, secondary 13, titles 20 / 22, with 17
 * as the one step between a title and body (the same size the chat header
 * uses for the agent's name). Markdown headings are structure inside a
 * message or a description, so they top out at the "big title" size.
 */
const MD_FONT = {
  body: 15,
  h1: 22,
  h2: 20,
  h3: 17,
  // h4 and h5 are body-sized and carried by weight alone; h6 drops to the
  // secondary size.
  h4: 15,
  h5: 15,
  h6: 13,
  // Code block font size — mirrors the in-house `CodeBlock` component's
  // `text-[13px]`. The two paths MUST agree so top-level fenced code
  // (rendered by CodeBlock) and list-nested code (rendered by enriched via
  // this style) look identical. Mono glyphs are visually denser than the
  // grotesque at the same size, so 13 sits level with 15 body.
  codeBlock: 13,
  // Inline code sits one step under body for the same reason.
  code: 14,
} as const;

const MD_LINE = {
  // Body 15 on a 23 line (ratio 1.53): the reading rhythm of the Graphite
  // mockups, and still ≥1.5 so CJK paragraphs keep their leading.
  body: 23,
  // Heading lineHeights MUST be passed explicitly: enriched-markdown's
  // heading defaults are (h1: 36, h2: 30, h3: 26, ...) calibrated for THEIR
  // default fontSize (30/24/20/...). Without an override a 22pt h1 would sit
  // on a 36pt line and read as wildly over-spaced.
  h1: 28,
  h2: 26,
  h3: 24,
  h4: 22,
  h5: 22,
  h6: 19,
} as const;

const MD_GAP = {
  paragraph: 12,
  headingTopLarge: 18,
  headingTopSmall: 12,
  headingBottomLarge: 8,
  headingBottomSmall: 6,
} as const;

export function useMarkdownStyle() {
  const { isDarkColorScheme } = useColorScheme();
  const t = isDarkColorScheme ? THEME.dark : THEME.light;

  return useMemo(
    () => ({
      // Body / paragraph — 15/23.
      paragraph: {
        fontFamily: SANS_FONT,
        fontSize: MD_FONT.body,
        lineHeight: MD_LINE.body,
        color: t.foreground,
        marginBottom: MD_GAP.paragraph,
      },
      // Headings — DESIGN.md scale, all 600.
      h1: {
        fontFamily: SANS_FONT,
        fontSize: MD_FONT.h1,
        lineHeight: MD_LINE.h1,
        fontWeight: "600" as const,
        color: t.foreground,
        marginTop: MD_GAP.headingTopLarge,
        marginBottom: MD_GAP.headingBottomLarge,
      },
      h2: {
        fontFamily: SANS_FONT,
        fontSize: MD_FONT.h2,
        lineHeight: MD_LINE.h2,
        fontWeight: "600" as const,
        color: t.foreground,
        marginTop: MD_GAP.headingTopLarge,
        marginBottom: MD_GAP.headingBottomLarge,
      },
      h3: {
        fontFamily: SANS_FONT,
        fontSize: MD_FONT.h3,
        lineHeight: MD_LINE.h3,
        fontWeight: "600" as const,
        color: t.foreground,
        marginTop: MD_GAP.headingTopSmall,
        marginBottom: MD_GAP.headingBottomSmall,
      },
      h4: {
        fontFamily: SANS_FONT,
        fontSize: MD_FONT.h4,
        lineHeight: MD_LINE.h4,
        fontWeight: "600" as const,
        color: t.foreground,
        marginTop: MD_GAP.headingTopSmall,
        marginBottom: MD_GAP.headingBottomSmall,
      },
      h5: {
        fontFamily: SANS_FONT,
        fontSize: MD_FONT.h5,
        lineHeight: MD_LINE.h5,
        fontWeight: "600" as const,
        color: t.foreground,
        marginTop: MD_GAP.headingTopSmall,
        marginBottom: MD_GAP.headingBottomSmall,
      },
      h6: {
        fontFamily: SANS_FONT,
        fontSize: MD_FONT.h6,
        lineHeight: MD_LINE.h6,
        fontWeight: "600" as const,
        color: t.foreground,
        marginTop: MD_GAP.headingTopSmall,
        marginBottom: MD_GAP.headingBottomSmall,
      },
      strong: {
        // md4c restricts inline `fontWeight` to "bold" | "normal" — it adds
        // the bold trait on top of the inherited block font. We can't pin
        // a 600 weight here the way we can on headings.
        fontWeight: "bold" as const,
        color: t.foreground,
      },
      em: {
        // STYLES.md confirms enriched adds italic by default; we set it
        // explicitly for parity with `strong` (which explicitly sets
        // fontWeight: "bold").
        fontStyle: "italic" as const,
        color: t.foreground,
      },
      strikethrough: {
        color: t.mutedForeground,
      },
      underline: {
        color: t.foreground,
      },
      // Links are the one coloured thing in prose: the accent, underlined so
      // they do not rely on colour alone.
      link: {
        color: t.primary,
        underline: true,
      },
      // Inline code — JetBrains Mono on `card` with a hairline, the same
      // surface as a code block. `CodeStyle` has no padding / radius knobs
      // (upstream #255), so the chip is whatever box the native layer draws;
      // see docs/markdown-rendering-adr.md "Known limitations" — if the chip
      // reads top-heavy on a device, set both colours back to "transparent".
      // Size is one step under body so mono does not read larger than the
      // grotesque around it, and never larger than block code + 1.
      code: {
        fontFamily: MONO_FONT,
        color: t.foreground,
        backgroundColor: t.card,
        borderColor: t.border,
        fontSize: MD_FONT.code,
      },
      // Block code — the fallback for code that stays inside the enriched
      // prose stream (e.g. nested in a list item); top-level fences route to
      // the in-house `CodeBlock`, and the two must look the same: mono 13 on
      // `card`, hairline border, panel radius. `borderColor` is REQUIRED:
      // enriched defaults to `#374151`, which clashes with our background.
      codeBlock: {
        fontFamily: MONO_FONT,
        fontSize: MD_FONT.codeBlock,
        lineHeight: 20,
        color: t.foreground,
        backgroundColor: t.card,
        borderColor: t.border,
        borderWidth: 1,
        padding: 12,
        borderRadius: MOBILE_RADIUS.lg,
        marginBottom: MD_GAP.paragraph,
      },
      // Blockquote — `color` is REQUIRED: enriched's default is a hardcoded
      // #4B5563 mid-gray that disappears on dark backgrounds.
      //
      // borderWidth: 3 (was 2) — iOS quote bars in Apple Notes / Linear /
      // Things are 3-4pt thick. 2pt was too thin to register as a visual
      // accent. Whether enriched draws this as a 3pt left bar or as a 3pt
      // full-frame border depends on the library schema (STYLES.md doesn't
      // distinguish); needs simulator verification — see TODO below.
      blockquote: {
        fontFamily: SANS_FONT,
        color: t.mutedForeground,
        fontSize: MD_FONT.body,
        lineHeight: MD_LINE.body,
        borderColor: t.border,
        borderWidth: 3,
        backgroundColor: "transparent",
        marginBottom: MD_GAP.paragraph,
      },
      // List — bullets in muted-foreground so they don't compete with content.
      // `color` is REQUIRED: enriched's default text color does NOT track
      // dark mode, so list items render in hardcoded near-black and are
      // invisible on dark backgrounds. This was the visible bug in #MUL-2395
      // dark-mode screenshot (2026-05-19).
      list: {
        fontFamily: SANS_FONT,
        color: t.foreground,
        fontSize: MD_FONT.body,
        lineHeight: MD_LINE.body,
        bulletColor: t.mutedForeground,
        bulletSize: 4,
        markerColor: t.mutedForeground,
        gapWidth: 8,
        marginLeft: 16,
      },
      image: {
        borderRadius: MOBILE_RADIUS.lg,
        marginBottom: MD_GAP.paragraph,
      },
      // Task lists. `checkedTextColor` REQUIRED: enriched default is `#000000`,
      // making completed items invisible in dark mode.
      taskList: {
        checkedColor: t.primary,
        borderColor: t.border,
        checkmarkColor: t.primaryForeground,
        checkedTextColor: t.mutedForeground,
        checkboxSize: 16,
      },
      // GFM tables. Every color field below is required — enriched defaults
      // are all hardcoded light values (#FFFFFF row even, #F9FAFB row odd,
      // #111827 header text), all invisible / clashing in dark mode.
      // The header row sits on `secondary`, one step above both the page and
      // a `card` bubble, so it stays distinct wherever the table renders.
      table: {
        fontFamily: SANS_FONT,
        headerFontFamily: SANS_FONT,
        color: t.foreground,
        fontSize: MD_FONT.body,
        lineHeight: MD_LINE.body,
        borderColor: t.border,
        // Match the panel radius used by codeBlock and image.
        borderRadius: MOBILE_RADIUS.lg,
        headerBackgroundColor: t.secondary,
        headerTextColor: t.foreground,
        // Transparent rows let the page background show through — works in
        // both light (white page) and dark (near-black page) without a
        // jarring inner panel.
        rowEvenBackgroundColor: "transparent",
        rowOddBackgroundColor: "transparent",
        cellPaddingHorizontal: 10,
        cellPaddingVertical: 6,
        // Was missing — every other block-level element sets marginBottom
        // (paragraph/codeBlock/blockquote/image/math all 12). Without this
        // the table sits flush against the following paragraph.
        marginBottom: MD_GAP.paragraph,
      },
      // Horizontal rule. `color` alone is not enough — without explicit
      // vertical margin the divider sits flush against neighbouring blocks
      // and reads as a sub-pixel line rather than a section separator.
      // marginTop/marginBottom = 16 matches MD_GAP.headingTopLarge so the
      // rule feels like a paragraph-level boundary.
      thematicBreak: {
        color: t.border,
        marginTop: 16,
        marginBottom: 16,
      },
      // LaTeX math (free with this engine — was V3 deferred under the walker).
      math: {
        fontSize: 16,
        color: t.foreground,
        backgroundColor: t.card,
        padding: 12,
        marginBottom: MD_GAP.paragraph,
        textAlign: "center" as const,
      },
      inlineMath: {
        color: t.foreground,
      },
    }),
    [t],
  );
}
