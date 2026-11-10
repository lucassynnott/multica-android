/**
 * Former Projects tab. Projects is now reached from More (`more/projects`),
 * and this route is hidden from the tab bar (`href: null` in the tabs layout).
 *
 * The file stays because `/:workspace/projects` was a real destination: a
 * saved link, a notification or restored navigation state can still ask for
 * it. Landing here selects the More tab and opens the projects list on top of
 * it, so the list is on screen and Back returns to More, where the Projects
 * row lives — the same stack the user would have built by hand.
 */
import { useCallback } from "react";
import { View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useWorkspaceStore } from "@/data/workspace-store";

export default function ProjectsTabRedirect() {
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);

  useFocusEffect(
    useCallback(() => {
      if (!slug) {
        router.replace("/select-workspace");
        return;
      }
      router.navigate(`/${slug}/more`);
      router.push(`/${slug}/more/projects`);
    }, [slug]),
  );

  return <View className="flex-1 bg-background" />;
}
