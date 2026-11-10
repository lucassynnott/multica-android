/**
 * Badge — a small label chip, in Graphite.
 *
 * Graphite has one accent, so a badge never carries its own hue: `default` is
 * the accent fill (use it sparingly, it reads as "primary"), `destructive` is
 * accent text on a hairline, and every other variant is neutral. `success` /
 * `info` / `warning` stay as variant names so existing callers compile, but
 * they draw the same neutral chip — status and priority are told apart by
 * their icons, not by a fill. Corners are square-ish (`rounded-sm`): a pill is
 * reserved for people and status dots.
 *
 * This replaces the per-screen status chips the app used to hand-roll: one
 * badge, one height, one radius, so a status reads the same on a board card, in
 * the inbox, and in an issue header.
 */
import * as React from "react";
import { View, type ViewProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";

const badgeVariants = cva(
  "h-5 flex-row items-center justify-center gap-1 self-start overflow-hidden rounded-sm border px-1.5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary",
        secondary: "border-transparent bg-secondary",
        outline: "border-border bg-transparent",
        destructive: "border-border bg-transparent",
        success: "border-transparent bg-secondary",
        info: "border-transparent bg-secondary",
        warning: "border-transparent bg-secondary",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const badgeTextVariants = cva("text-xs font-medium leading-none", {
  variants: {
    variant: {
      default: "text-primary-foreground",
      secondary: "text-secondary-foreground",
      outline: "text-foreground",
      destructive: "text-destructive",
      success: "text-secondary-foreground",
      info: "text-secondary-foreground",
      warning: "text-secondary-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

/** Numeric badge for counts — tab bars, column headers, unread pills. */
const countVariants = cva(
  "min-w-4.5 h-4.5 items-center justify-center",
);

type BadgeVariantValue = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const BadgeVariantContext = React.createContext<BadgeVariantValue>("default");

/**
 * Badge.Text — the label. Reads the badge's variant from context so callers
 * never repeat the foreground colour, and so a badge with a leading dot or
 * icon still labels itself correctly.
 */
function BadgeText({ children, className }: { children: React.ReactNode; className?: string }) {
  const variant = React.useContext(BadgeVariantContext);
  return (
    <Text className={cn(badgeTextVariants({ variant }), className)} numberOfLines={1}>
      {children}
    </Text>
  );
}

interface Props extends ViewProps, VariantProps<typeof badgeVariants> {
  label?: string;
  className?: string;
  textClassName?: string;
  children?: React.ReactNode;
}

function BadgeBase({ label, variant = "default", className, textClassName, children, ...props }: Props) {
  return (
    <BadgeVariantContext.Provider value={(variant ?? "default") as BadgeVariantValue}>
      <View className={cn(badgeVariants({ variant }), className)} {...props}>
        {label !== undefined ? (
          <Text className={cn(badgeTextVariants({ variant }), textClassName)} numberOfLines={1}>
            {label}
          </Text>
        ) : (
          children
        )}
      </View>
    </BadgeVariantContext.Provider>
  );
}

const Badge = Object.assign(BadgeBase, { Text: BadgeText });

/** Count — mono figures, muted, no chip behind them. Reads as metadata, not status. */
function CountBadge({ value, className }: { value: number | string; className?: string }) {
  return (
    <View className={cn(countVariants(), className)}>
      <Text className="font-mono text-xs text-muted-foreground">{value}</Text>
    </View>
  );
}

export { Badge, BadgeText, CountBadge, badgeVariants, badgeTextVariants };
export type BadgeProps = Props;
