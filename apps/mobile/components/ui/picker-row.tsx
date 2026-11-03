/**
 * PickerRow — the one option row used by every formSheet picker body.
 *
 * Nova/shadcn geometry: 12pt vertical padding, a 14/500 label with an
 * optional 12pt muted second line, a leading icon (16–18px) or avatar, and a
 * trailing check that only the selected row draws. The selected row is marked
 * by `bg-secondary` alone — no border, no chip — so a list reads as a plain
 * menu instead of a stack of outlined buttons.
 *
 * Kept as a row primitive rather than a picker body so the status / priority /
 * assignee / project / label / mention lists (issue, new-issue, new-project and
 * project edit routes) share one geometry: an option must look the same
 * whichever sheet it appears in.
 */
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface Props {
  /** Primary label — 14/500. Caller owns i18n. */
  label?: string;
  /**
   * Custom primary content, wins over `label`. Used by status rows, which
   * render the shared StatusBadge instead of a plain string so a status reads
   * the same in a picker as on a board card.
   */
  labelNode?: ReactNode;
  /** Optional muted second line — 12pt. Use for actor type, "needs runtime", hints. */
  description?: string;
  /** Leading slot: a 16–18px icon, or an avatar. */
  leading?: ReactNode;
  /** Trailing slot, left of the check — counts or tags that must stay inline. */
  trailing?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** Extra row classes (kept for inset variants inside grouped sheets). */
  className?: string;
}

export function PickerRow({
  label,
  labelNode,
  description,
  leading,
  trailing,
  selected = false,
  disabled = false,
  onPress,
  className,
}: Props) {
  const { colorScheme } = useColorScheme();
  const checkColor =
    colorScheme === "dark" ? THEME.dark.primary : THEME.light.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "flex-row items-center gap-3 px-4 py-3",
        selected ? "bg-secondary" : "active:bg-secondary/60",
        disabled && "opacity-50",
        className,
      )}
    >
      {leading ? (
        <View className="w-7 items-center justify-center">{leading}</View>
      ) : null}
      <View className="flex-1">
        {labelNode ?? (
          <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
            {label}
          </Text>
        )}
        {description ? (
          <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing}
      {selected ? (
        <Ionicons name="checkmark" size={18} color={checkColor} />
      ) : null}
    </Pressable>
  );
}

/** Sheet-body title: 16pt semibold, 16pt page inset, no uppercase. */
export function PickerTitle({ children }: { children: string }) {
  return (
    <View className="px-4 pb-1 pt-3">
      <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

/** Muted 11px section label for grouped lists — sentence case, no tracking. */
export function PickerSectionLabel({ children }: { children: string }) {
  return (
    <View className="px-4 pb-1 pt-3">
      <Text className="text-[11px] font-medium text-muted-foreground">
        {children}
      </Text>
    </View>
  );
}
