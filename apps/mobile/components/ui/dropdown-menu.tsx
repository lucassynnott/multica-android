/**
 * Mobile DropdownMenu — styled wrapper around @rn-primitives/dropdown-menu.
 *
 * Follows the RNR / shadcn-style API: composable Root + Trigger + Portal +
 * Overlay + Content + Item. Graphite: a bordered `bg-popover` panel with a
 * hairline and no shadow; items are 44dp rows at the 15dp body size. Default open / close animation is the primitive's own
 * fade — no custom Reanimated layer.
 *
 * The Overlay is transparent + closeOnPress: tapping anywhere outside the
 * menu dismisses it (iOS/Android standard popover behaviour).
 */
import * as React from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";
import * as DropdownMenuPrimitive from "@rn-primitives/dropdown-menu";
import { TextClassContext } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

function DropdownMenuOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Overlay>) {
  return (
    <DropdownMenuPrimitive.Overlay
      style={Platform.OS !== "web" ? StyleSheetAbsoluteFill : undefined}
      className={cn("z-50", className)}
      closeOnPress
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  side = "bottom",
  align = "end",
  portalHost,
  overlayClassName,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content> & {
  portalHost?: string;
  overlayClassName?: string;
}) {
  return (
    <DropdownMenuPrimitive.Portal hostName={portalHost}>
      <DropdownMenuOverlay className={overlayClassName} />
      <DropdownMenuPrimitive.Content
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover border-border z-50 min-w-[12rem] overflow-hidden rounded-lg border p-1",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <TextClassContext.Provider
      value={cn(
        "text-[15px] leading-[21px]",
        variant === "destructive"
          ? "text-destructive group-active:text-destructive"
          : "text-popover-foreground group-active:text-accent-foreground",
      )}
    >
      <DropdownMenuPrimitive.Item
        className={cn(
          "group min-h-11 flex-row items-center gap-2 rounded-sm px-3 py-2 active:bg-secondary",
          variant === "destructive" && "active:bg-destructive/10",
          inset && "pl-8",
          className,
        )}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "text-muted-foreground px-3 py-1.5 text-[13px] font-semibold",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

const StyleSheetAbsoluteFill: StyleProp<ViewStyle> = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
};
