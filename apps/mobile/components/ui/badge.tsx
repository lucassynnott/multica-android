/**
 * Badge — shadcn (Nova) badge, ported to RN.
 *
 * Reference: shadcn/ui `components/ui/badge.tsx` in the Nova style used by
 * bundui/shadcn-ui-kit-dashboard: `h-5 w-fit items-center justify-center gap-1
 * overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs
 * font-medium`, with `success` / `info` / `warning` variants carrying a tinted
 * background plus a 1 px saturated border.
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
  "h-5 flex-row items-center justify-center gap-1 self-start overflow-hidden rounded-full border px-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary",
        secondary: "border-transparent bg-secondary",
        outline: "border-border bg-transparent",
        destructive: "border-transparent bg-destructive/10",
        success: "border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-900/60",
        info: "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/60",
        warning: "border-orange-400 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/60",
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
      success: "text-green-800 dark:text-green-100",
      info: "text-blue-800 dark:text-blue-100",
      warning: "text-orange-800 dark:text-orange-100",
    },
  },
  defaultVariants: { variant: "default" },
});

/** Numeric badge for counts — tab bars, column headers, unread pills. */
const countVariants = cva(
  "min-w-4.5 h-4.5 items-center justify-center rounded-full bg-secondary px-1.5",
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

/** Count pill — tabular figures, muted, no border. Reads as metadata, not status. */
function CountBadge({ value, className }: { value: number | string; className?: string }) {
  return (
    <View className={cn(countVariants(), className)}>
      <Text className="text-[11px] font-medium text-muted-foreground tabular-nums">{value}</Text>
    </View>
  );
}

export { Badge, BadgeText, CountBadge, badgeVariants, badgeTextVariants };
export type BadgeProps = Props;
