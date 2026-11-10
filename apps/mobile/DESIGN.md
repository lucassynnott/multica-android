# Mobile design: Graphite

The visual system for `apps/mobile`. Reference mockups: the "The whole app in
Graphite + Schibsted Grotesk" row of the design canvas. Tokens live in
`global.css`, mirrored in `lib/theme.ts` and mapped in `tailwind.config.js`.

## Principles

- **Lists, not cards.** Content is dense rows separated by hairlines
  (`border-border`). A bordered panel (`bg-card border border-border
  rounded-lg`) is for things that are objects in their own right: a kanban
  card, a code block, an input, a chat bubble from the user. Never nest panels.
- **One accent.** Vermilion (`primary`) means: the primary action on a screen,
  the current selection where it must stand out, unread, and urgent. Nothing
  else is coloured. Empty editable fields read as an action in the accent
  ("Assign", "Set date"), not as a dash.
- **Quiet chrome.** No shadows, no gradients, no filled icon buttons except the
  primary action. Borders are hairlines one step lighter than the surface.

## Colour (use the Tailwind token, never a literal)

| Role | Class | Dark value |
| --- | --- | --- |
| Page | `bg-background` | L 3.9% |
| Panel / input / kanban card | `bg-card` | L 7.5% |
| Pressed row, selected segment | `bg-secondary` | L 12% |
| Hairline | `border-border` | L 14.5% |
| Text | `text-foreground` | L 92% |
| Secondary text, ids, counts | `text-muted-foreground` | L 65% |
| Primary action fill / on it | `bg-primary` / `text-primary-foreground` | vermilion / near-black |
| Accent text (urgent, empty-field action, destructive) | `text-primary` / `text-destructive` | vermilion / lighter vermilion |

Status and priority keep their existing icons; do not add colour fills for them.

## Type

- **Schibsted Grotesk** (`font-sans`, the default of `components/ui/text`) for
  everything people read. Weights 400 / 500 / 600 / 700 are real font files.
- **JetBrains Mono** (`font-mono`) for things that are codes or counts: issue
  identifiers (`FOLD-12`), counts next to a heading, timestamps in lists,
  email addresses and hostnames, agent run output.
- Scale, and nothing between: screen title 20/600 (`text-xl font-semibold`),
  big title on an issue 22/600, body and row titles 15 (`text-[15px]
  leading-[21px]`), secondary 13 (`text-[13px]`), mono meta 12 (`text-xs
  font-mono`). Section labels are 13/600 muted, sentence case, never
  uppercase or tracked.
- A raw React Native `<Text>` or `<TextInput>` does not inherit the family:
  use `components/ui/text`, or add `font-sans` / `font-mono` yourself.

## Shape and size

- Radius: `rounded-lg` (8dp, the nearest step on the shared radius ladder to
  the mockups' 10) for panels, inputs, buttons and segments;
  `rounded-full` only for a person's avatar and status dots.
- Every touch target is at least 44dp (`min-h-11`, or `hitSlop`).
- Screen gutter is 20dp (`px-5`). Rows are `min-h-11`, with `py-2.5`.

## Recurring patterns

- **Screen header** (`components/ui/header`): title 20/600 with an optional
  mono count beside it ("Board 12 open"), actions on the right as 48dp icon
  buttons. The one primary action is a 36dp vermilion tile with a dark icon.
- **Group header**: a 44dp row with a top hairline: name 13/600, mono count,
  optional trailing control.
- **Row**: mono id in a fixed 62dp column (muted), title 15, trailing meta 12
  muted (vermilion and 600 only when urgent), then the assignee avatar.
- **Property list**: label 13 muted in a 104dp column, value 15; the block has
  a hairline above and below.
- **Segmented picker**: a `bg-secondary` track with `rounded-lg`, 3dp padding,
  44x38 segments; the selected segment is one step lighter with foreground
  ink, the others muted.
- **Tabs inside a screen** (Inbox sections): text tabs, the selected one 600
  with a 2dp foreground underline.

## Actors

`components/ui/actor-avatar` draws all of them. **Agents keep their own icon
(emoji or image) on a square tile** (`rounded-lg`, `bg-secondary`, hairline
border). **People are a circle** with their photo or initial. The shape tells
agent from human; the icon tells agents apart. Show the avatar wherever an
actor is named: assignee on rows and cards, inbox rows, activity entries, the
chat header and above each agent reply.

## Background texture

`components/ui/tide-texture` (`<TideTexture />`) is the only decoration: a
slow tide of tiny glyphs at ~9% opacity in the lower part of a screen. Put it
as the first child of a top-level screen root, once per screen, never inside
a list row, sheet body or modal. Typical heights: 420 on tab roots, 300 on
detail screens, 560 on the sign-in screen. It respects reduced motion, pauses
when unfocused, and the user can turn it off in Settings.
