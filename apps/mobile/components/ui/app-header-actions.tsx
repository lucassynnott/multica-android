/**
 * Header utility buttons shared across primary tabs (Inbox / My Issues).
 * Provides two global actions on the right: search and create-issue.
 *
 * Create is the screen's one primary action, so it is the only filled
 * control: a 36dp vermilion tile with a dark glyph, centred in a 48dp touch
 * target. On non-compact widths the navigation rail carries the same tile at
 * its top (see `components/nav/app-tab-bar.tsx`), so it is dropped here
 * rather than shown twice.
 *
 * The workspace menu (global nav, workspace switcher, settings) is reached
 * via the "More" tab in the bottom bar.
 *
 * Tab-specific actions (e.g. My Issues filter) MUST NOT live here — they
 * mix scope levels with global actions and would clutter the strip.
 */
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { IconButton } from "@/components/ui/icon-button";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";
import { useResponsiveLayout } from "@/lib/responsive";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";

export function HeaderActions() {
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { t } = useT();
  const { isCompact } = useResponsiveLayout();
  const { colorScheme } = useColorScheme();

  const onSearch = () => {
    if (slug) router.push(`/${slug}/search`);
  };
  const onCreate = () => {
    if (slug) router.push(`/${slug}/new-issue`);
  };

  return (
    <>
      <IconButton
        name="search"
        onPress={onSearch}
        accessibilityLabel={t("common:actions.search")}
      />
      {isCompact ? (
        <Pressable
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel={t("navigation:routes.new_issue")}
          className="size-12 items-center justify-center active:opacity-80"
        >
          <View className="size-9 items-center justify-center rounded-lg bg-primary">
            <Ionicons
              name="add"
              size={22}
              color={THEME[colorScheme].primaryForeground}
            />
          </View>
        </Pressable>
      ) : null}
    </>
  );
}
