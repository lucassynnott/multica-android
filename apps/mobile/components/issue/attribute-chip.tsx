/**
 * Property chip used on issue forms: a 44 dp bordered `rounded-lg` button
 * pairing an icon node (any RN element — StatusIcon, PriorityIcon,
 * ActorAvatar, emoji, etc) with a label.
 *
 *   filled — the property has a value: `bg-card`, foreground text.
 *   dimmed — nothing set yet: no fill, muted text naming the field.
 *
 * The chip becomes a Pressable when `onPress` is provided. Without onPress it
 * renders as a plain View — used for read-only chips.
 */
import { Pressable, View } from "react-native";
import type { ReactNode } from "react";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface Props {
  icon: ReactNode;
  label: string;
  variant?: "filled" | "dimmed";
  onPress?: () => void;
  className?: string;
}

export function AttributeChip({
  icon,
  label,
  variant = "filled",
  onPress,
  className,
}: Props) {
  const containerClass = cn(
    "h-11 max-w-full flex-row items-center gap-2 rounded-lg border border-border px-3.5",
    variant === "filled" ? "bg-card" : "bg-transparent",
    className,
  );
  const labelClass = cn(
    "shrink text-sm",
    variant === "filled" ? "text-foreground" : "text-muted-foreground",
  );

  const inner = (
    <>
      {icon}
      <Text className={labelClass} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        className={cn(containerClass, "active:bg-secondary")}
      >
        {inner}
      </Pressable>
    );
  }
  return <View className={containerClass}>{inner}</View>;
}
