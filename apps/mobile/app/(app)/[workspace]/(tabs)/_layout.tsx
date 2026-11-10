/**
 * Tabs host. Route definitions plus the layout that seats our own bar.
 *
 * The bar is `components/nav/app-tab-bar.tsx`, drawn by us rather than by React
 * Navigation: the bundled material bar mislays its content at the cover
 * screen's 467dp — it drops the labels and clips the icon row into the strip
 * above the system gesture pill. Drawing it ourselves keeps one stable
 * component for both shapes, so a fold is a relayout and never a tree rebuild
 * (swapping `tabBarVariant` rebuilt the tree and reset the selected tab on every
 * posture change).
 *
 * The navigator renders no bar of its own; the bar is a sibling in normal flow
 * and the screen area takes what is left, so the two can't disagree about the
 * bar's size — which is what produced the clipped icon rows while the
 * navigator owned the height.
 *
 * Five destinations: Inbox, Mine, Board, Chat, More. Projects is no longer a
 * tab — it is a row on the More screen (`more/projects`). The `projects`
 * route file stays registered, hidden from the bar, only so links to the old
 * tab still resolve; see `(tabs)/projects.tsx`.
 */
import { Tabs, router, usePathname } from "expo-router";
import { View } from "react-native";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { useResponsiveLayout } from "@/lib/responsive";
import {
  useInboxUnreadCount,
  useChatUnreadMessageCount,
} from "@/lib/unread-counts";
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

  // Graphite marks the selected tab with ink and weight, not a filled glyph,
  // so both states use the same outline icon.
  const items: TabItem[] = [
    {
      name: "inbox",
      label: t("tabs.inbox"),
      sf: ["tray", "tray"],
      ion: ["file-tray-outline", "file-tray-outline"],
      badge: inboxUnread,
    },
    {
      name: "my-issues",
      label: t("tabs.mine"),
      sf: ["person", "person"],
      ion: ["person-outline", "person-outline"],
    },
    {
      name: "board",
      label: t("tabs.board"),
      sf: ["rectangle.split.3x1", "rectangle.split.3x1"],
      ion: ["grid-outline", "grid-outline"],
      glyph: "board",
    },
    {
      name: "chat",
      label: t("tabs.chat"),
      sf: ["bubble.left", "bubble.left"],
      ion: ["chatbubble-outline", "chatbubble-outline"],
      badge: chatUnread,
    },
    {
      name: "more",
      label: t("tabs.more"),
      sf: ["line.3.horizontal", "line.3.horizontal"],
      ion: ["menu-outline", "menu-outline"],
    },
  ];

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
          {/* Not a destination any more; kept so old links resolve. */}
          <Tabs.Screen name="projects" options={{ href: null }} />
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
        brand={theme.primary}
        brandForeground={theme.primaryForeground}
        ripple={theme.secondary}
        onNewIssue={() => {
          if (wsSlug) router.push(`/${wsSlug}/new-issue`);
        }}
        newIssueLabel={t("routes.new_issue")}
      />
    </View>
  );
}
