/**
 * Single-line text input. Notes:
 * - `fontSize` is set inline; do NOT use Tailwind `text-*` here. NativeWind
 *   maps those to fontSize+lineHeight, and `lineHeight` on iOS TextInput
 *   clips descenders (RN issues #41240, #28012, #45268, #49886).
 * - Height anchored by `h-11` (the 44dp touch target) so vertical centering doesn't depend on
 *   font metrics.
 * - `includeFontPadding` / `textAlignVertical` are Android-only; iOS no-op,
 *   kept for when Android lands.
 * - Focus state is tracked manually because NativeWind's `focus:` variant
 *   on TextInput is unreliable across SDK upgrades.
 * - Graphite: an input is a panel (`bg-card`, hairline, `rounded-lg`). Focus
 *   is a lighter hairline, not the accent — vermilion is kept for actions.
 * - `font-sans` is explicit: a raw TextInput does not inherit the app family.
 */
import { useState } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";

export interface TextFieldProps extends TextInputProps {
  className?: string;
  invalid?: boolean;
}

export function TextField({
  className,
  style,
  invalid,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const { colorScheme } = useColorScheme();

  return (
    <TextInput
      placeholderTextColor={THEME[colorScheme].mutedForeground}
      style={[
        { fontSize: 15, includeFontPadding: false, textAlignVertical: "center" },
        style,
      ]}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      className={cn(
        "rounded-lg px-3 h-11 font-sans text-foreground border",
        invalid
          ? "bg-destructive/10 border-destructive/60"
          : focused
            ? "bg-card border-muted-foreground"
            : "bg-card border-border",
        className,
      )}
      {...rest}
    />
  );
}
