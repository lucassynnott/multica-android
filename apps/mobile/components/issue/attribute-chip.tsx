/**
 * Generic attribute chip used on issue forms. Each chip pairs an icon node
 * (any RN element — StatusIcon, PriorityIcon, ActorAvatar, emoji, etc) with a
 * textual label. Filled = the property has a value; dimmed = empty placeholder
 * ("Label", "Cycle", ...).
 *
 * Visual: a quiet outline pill in the shadcn Nova language — 24 pt tall,
 * `text-xs`, a 1 px border and no fill, so a row of these reads as metadata
 * rather than as a stack of buttons. The dimmed state keeps the dashed border
 * (at 30 % of muted-foreground) to say "nothing set yet" without adding colour.
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
    "h-6 flex-row items-center gap-1.5 rounded-full border px-2.5",
    variant === "filled"
      ? "border-border bg-transparent"
      : "border-dashed border-muted-foreground/30 bg-transparent",
    className,
  );
  const labelClass = cn(
    "text-xs",
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
        className={cn(containerClass, "active:bg-secondary")}
        hitSlop={4}
      >
        {inner}
      </Pressable>
    );
  }
  return <View className={containerClass}>{inner}</View>;
}
