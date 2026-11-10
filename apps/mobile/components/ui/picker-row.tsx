/**
 * PickerRow — the one option row used by every formSheet picker body.
 *
 * Graphite row geometry: 44dp minimum on the 20dp gutter, a 15dp label with
 * an optional 13dp muted second line, a leading icon (16–18px) or avatar, and
 * a trailing accent check that only the selected row draws. The selected row
 * is marked by `bg-secondary` and a 600 label — no border, no chip — so a list
 * reads as a plain menu instead of a stack of outlined buttons.
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
  /** Primary label — 15dp body. Caller owns i18n. */
  label?: string;
  /**
   * Custom primary content, wins over `label`. Used by status rows, which
   * render the shared StatusBadge instead of a plain string so a status reads
   * the same in a picker as on a board card.
   */
  labelNode?: ReactNode;
  /** Optional muted second line — 13dp. Use for actor type, "needs runtime", hints. */
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
        "min-h-11 flex-row items-center gap-3 px-5 py-2.5",
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
          <Text
            className={cn(
              "text-[15px] leading-[21px] text-foreground",
              selected && "font-semibold",
            )}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
        {description ? (
          <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
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

/** Sheet-body title: the 20/600 screen-title size on the 20dp gutter. */
export function PickerTitle({ children }: { children: string }) {
  return (
    <View className="px-5 pb-2 pt-4">
      <Text className="text-xl font-semibold text-foreground" numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

/** Section label for grouped lists: 13/600 muted, sentence case, no tracking. */
export function PickerSectionLabel({ children }: { children: string }) {
  return (
    <View className="px-5 pb-1.5 pt-4">
      <Text className="text-[13px] font-semibold text-muted-foreground">
        {children}
      </Text>
    </View>
  );
}
