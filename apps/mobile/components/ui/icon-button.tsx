/**
 * Icon-only button — RNR `<Button variant="ghost" size="icon">` wrapping an
 * Ionicon. The box is 48dp (the `icon` size) with no fill: Graphite keeps
 * chrome quiet, and only a screen's one primary action gets a filled tile. The icon color falls back to the active navigation theme's
 * foreground (via `useTheme()`), so dark mode flips automatically without
 * anyone passing a color prop.
 *
 * Use everywhere we'd otherwise hand-write
 *   <Pressable className="size-9 active:bg-secondary"><Ionicons color={literal} /></Pressable>
 * — that pattern hardcodes a light-mode hex and reinvents button chrome RNR
 * already ships.
 */
import { type ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "expo-router";
import { Button, type ButtonProps } from "@/components/ui/button";

interface Props extends Omit<ButtonProps, "children" | "size"> {
  name: ComponentProps<typeof Ionicons>["name"];
  /** Glyph size in points. Default 20 matches iOS toolbar icons. */
  iconSize?: number;
  /** Override the icon color. Defaults to NAV_THEME[scheme].text. */
  color?: string;
}

export function IconButton({
  name,
  iconSize = 20,
  color,
  ...buttonProps
}: Props) {
  const { colors } = useTheme();
  return (
    <Button variant="ghost" size="icon" {...buttonProps}>
      <Ionicons name={name} size={iconSize} color={color ?? colors.text} />
    </Button>
  );
}
