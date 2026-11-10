/**
 * ListRow — the Graphite navigation/settings row (mockup: AppMore).
 *
 * 52dp minimum on the 20dp gutter, a 15dp label, an optional 13dp muted
 * second line, then a muted 13dp trailing value and a chevron when the row
 * leads somewhere. Rows are separated by a hairline under each one; there is
 * no card around a group — "lists, not cards" (DESIGN.md).
 *
 * Used by the More screen, Settings and its subscreens, the workspace
 * switcher and the Agents list. Picker sheets keep `PickerRow`, which adds
 * selection state.
 */
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  /** Muted second line. Omit unless it says something the label does not. */
  description?: string;
  /** Leading slot — an avatar or a 16–18dp icon. */
  leading?: ReactNode;
  /** Short trailing text in muted 13dp (current value, a name). */
  value?: string;
  /** Renders `value` in mono: for counts, codes and addresses. */
  valueMono?: boolean;
  /** Trailing node, right of `value` and left of the chevron. */
  trailing?: ReactNode;
  /** Draw the disclosure chevron. Defaults to true when `onPress` is set. */
  chevron?: boolean;
  /** Accent ink for the label (sign out, remove). */
  destructive?: boolean;
  /** Emphasise the label (600) — the current item in a list of choices. */
  emphasized?: boolean;
  /** Hairline under the row. Default true; pass false on a group's last row
   *  only when something else already closes the group. */
  divider?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "switch" | "link";
  accessibilityState?: { checked?: boolean; selected?: boolean };
  className?: string;
}

export function ListRow({
  label,
  description,
  leading,
  value,
  valueMono = false,
  trailing,
  chevron,
  destructive = false,
  emphasized = false,
  divider = true,
  disabled = false,
  onPress,
  accessibilityLabel,
  accessibilityRole = "button",
  accessibilityState,
  className,
}: Props) {
  const { colorScheme } = useColorScheme();
  const showChevron = chevron ?? !!onPress;
  const content = (
    <>
      {leading}
      <View className="flex-1 justify-center">
        <Text
          className={cn(
            "text-[15px] leading-[21px]",
            destructive ? "text-destructive" : "text-foreground",
            emphasized && "font-semibold",
          )}
          numberOfLines={1}
        >
          {label}
        </Text>
        {description ? (
          <Text className="text-[13px] text-muted-foreground" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text
          className={cn(
            "max-w-[45%] text-muted-foreground",
            valueMono ? "font-mono text-xs" : "text-[13px]",
          )}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {trailing}
      {showChevron ? (
        <PlatformIcon
          sf="chevron.right"
          ion="chevron-forward"
          color={THEME[colorScheme].mutedForeground}
          size={16}
        />
      ) : null}
    </>
  );

  const rowClass = cn(
    "min-h-[52px] flex-row items-center gap-3 px-5 py-2.5",
    divider && "border-b border-border",
    className,
  );

  if (!onPress) {
    return <View className={rowClass}>{content}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      className={cn(rowClass, "active:bg-secondary")}
    >
      {content}
    </Pressable>
  );
}

/** Group label above a run of rows: 13/600 muted, sentence case. */
export function ListSectionLabel({
  children,
  trailing,
}: {
  children: string;
  /** Optional control on the right (e.g. "Restore defaults"). */
  trailing?: ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3 px-5 pb-1.5 pt-5">
      <Text className="shrink text-[13px] font-semibold text-muted-foreground">
        {children}
      </Text>
      {trailing}
    </View>
  );
}
