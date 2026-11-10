/**
 * Mobile screen header — single row, slot-based. Rendered in the screen's
 * JSX (NOT a react-navigation header), so dynamic content reaches it as
 * plain props instead of `navigation.setOptions` closures.
 *
 *   <Header title="Inbox" right={<HeaderActions />} />
 *   <Header title="Board" count="12" right={<HeaderActions />} />
 *   <Header center={<ChatTitleButton ... />} right={<ChatSessionActions ... />} />
 *
 * Self-handles the top safe area. Colors live on RNR tokens
 * (`bg-background`, `text-foreground`, `border-border`) so dark mode flips
 * via NativeWind without any logic here.
 *
 * For push screens (issue/[id], more/issues, etc.) keep using the native
 * Stack header — that's where the iOS back button + swipe-to-dismiss come
 * from. This component is for tab roots only.
 */
import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface Props {
  /** Title text (fallback when `center` is not provided). */
  title?: string;
  /**
   * Mono count beside the title ("Board 12"). Caller formats it; it is a
   * count or a short code, never a sentence. Ignored when `center` is provided.
   */
  count?: string;
  /** Optional subtitle below the title. Ignored when `center` is provided. */
  subtitle?: string;
  /** Centered custom node — wins over `title`. Use for tappable titles, agent pickers, etc. */
  center?: ReactNode;
  /** Leading slot (left of title). Use sparingly — most screens just leave it null. */
  left?: ReactNode;
  /** Trailing slot — action buttons, menus, search/add toolbar. */
  right?: ReactNode;
}

export function Header({ title, count, subtitle, center, left, right }: Props) {
  return (
    <SafeAreaView
      edges={["top"]}
      className="bg-background"
    >
      {/* 64dp row on the 20dp screen gutter. Trailing actions are 48dp icon
          buttons, so the right inset drops to 8dp to keep their glyphs on
          the gutter; same on the left when a leading slot is used. */}
      <View
        className={cn(
          "flex-row items-center min-h-16",
          left ? "pl-2" : "pl-5",
          right ? "pr-2" : "pr-5",
        )}
      >
        {left ? (
          <View className="flex-row items-center pr-1">{left}</View>
        ) : null}
        <View className="flex-1 justify-center">
          {center ?? (
            title ? (
              <>
                <View className="flex-row items-baseline gap-2">
                  <Text
                    className="shrink text-xl font-semibold text-foreground"
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {count ? (
                    <Text
                      className="font-mono text-[13px] text-muted-foreground"
                      numberOfLines={1}
                    >
                      {count}
                    </Text>
                  ) : null}
                </View>
                {subtitle ? (
                  <Text
                    className="text-[13px] text-muted-foreground"
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </>
            ) : null
          )}
        </View>
        {right ? <View className="flex-row items-center">{right}</View> : null}
      </View>
    </SafeAreaView>
  );
}
