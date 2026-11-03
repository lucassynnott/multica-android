/**
 * Tabs host. Route definitions plus the layout that seats our own bar.
 *
 * The bar is `components/nav/app-tab-bar.tsx`, drawn by us rather than by React
 * Navigation: the bundled material bar mislays six destinations at the cover
 * screen's 467dp — it drops the labels and clips the icon row into the strip
 * above the system gesture pill. Drawing it ourselves keeps one stable
 * component for both shapes, so a fold is a relayout and never a tree rebuild
 * (swapping `tabBarVariant` rebuilt the tree and reset the selected tab on every
 * posture change).
 *
 * The navigator renders no bar of its own; the bar is an absolutely positioned
 * sibling and the screen area is padded by exactly the bar's size. Both numbers
 * come from the same expression, so the two can't disagree — which is what
 * produced the clipped icon rows while the navigator owned the height.
 *
 * "More" is an action, not a destination: its press opens the overflow menu.
 * The stub `(tabs)/more.tsx` route exists only because every `Tabs.Screen`
 * needs a backing file.
 */
import { useRef } from "react";
import { Tabs, router, usePathname } from "expo-router";
import { View } from "react-native";
import type { TriggerRef } from "@rn-primitives/dropdown-menu";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { useResponsiveLayout } from "@/lib/responsive";
import {
  useInboxUnreadCount,
  useChatUnreadMessageCount,
} from "@/lib/unread-counts";
import { MoreTabDropdownAnchor } from "@/components/nav/more-tab-dropdown";
import { AppTabBar, type TabItem } from "@/components/nav/app-tab-bar";
import { useT } from "@/lib/i18n";

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme];
  const { t } = useT("navigation");
  const layout = useResponsiveLayout();
  const pathname = usePathname();
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);

  const inboxUnread = useInboxUnreadCount(wsId);
  const chatUnread = useChatUnreadMessageCount(wsId);

  // Imperative handle into the More dropdown. The trigger is invisible and
  // mounted by MoreTabDropdownAnchor below; open() also measures its rect so
  // the popover anchors to the right place.
  const moreTriggerRef = useRef<TriggerRef>(null);

  const items: TabItem[] = [
    {
      name: "inbox",
      label: t("tabs.inbox"),
      sf: ["tray", "tray.fill"],
      ion: ["file-tray-outline", "file-tray"],
      badge: inboxUnread,
    },
    {
      name: "my-issues",
      label: t("tabs.my_issues"),
      sf: ["checklist.unchecked", "checklist"],
      ion: ["list-circle-outline", "list-circle"],
    },
    {
      name: "board",
      label: t("tabs.board"),
      sf: ["rectangle.split.3x1", "rectangle.split.3x1.fill"],
      ion: ["grid-outline", "grid"],
    },
    {
      name: "projects",
      label: t("tabs.projects"),
      sf: ["folder", "folder.fill"],
      ion: ["folder-outline", "folder"],
    },
    {
      name: "chat",
      label: t("tabs.chat"),
      sf: ["bubble.left", "bubble.left.fill"],
      ion: ["chatbubble-outline", "chatbubble"],
      badge: chatUnread,
    },
    {
      name: "more",
      label: t("tabs.more"),
      sf: ["ellipsis", "ellipsis"],
      ion: ["ellipsis-horizontal", "ellipsis-horizontal"],
    },
  ];

  const moreIndex = items.length - 1;
  // The active tab is read from the URL rather than from navigator state: the
  // navigator no longer owns the bar, and the route is the single truth that
  // both the bar and the screens already agree on.
  const activeIndex = items.findIndex((item) =>
    pathname?.endsWith(`/${item.name}`),
  );
  return (
    <View
      style={{
        flex: 1,
        // Bottom bar on the cover screen, rail on the unfolded canvas. Both
        // are the same component in normal flow *outside* the navigator: the
        // navigator's own bar slot is what was clipping the icon row, and it
        // ignores a declared `tabBarStyle` height when the bar is custom.
        flexDirection: layout.isCompact ? "column" : "row-reverse",
      }}
    >
      <View style={{ flex: 1 }}>
        <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
          {items.map((item) => (
            <Tabs.Screen
              key={item.name}
              name={item.name}
              options={{ title: item.label }}
            />
          ))}
        </Tabs>
      </View>

      <AppTabBar
        items={items}
        compact={layout.isCompact}
        activeIndex={activeIndex}
        onPress={(index) => {
          const item = items[index];
          if (!item || !wsSlug) return;
          router.navigate(`/${wsSlug}/${item.name}`);
        }}
        background={theme.background}
        border={theme.border}
        foreground={theme.foreground}
        muted={theme.mutedForeground}
        brand={theme.brand}
        actionIndex={moreIndex}
        onAction={() => moreTriggerRef.current?.open()}
      />

      <MoreTabDropdownAnchor triggerRef={moreTriggerRef} />
    </View>
  );
}
