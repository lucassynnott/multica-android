/**
 * Projects browse page — reached from More. Keeps the native Stack header for
 * the back button; the list body itself is shared with the Projects tab via
 * `ProjectsList`, so the two views of the same data cannot drift.
 */
import { useCallback } from "react";
import { Stack, router } from "expo-router";
import { View } from "react-native";
import { IconButton } from "@/components/ui/icon-button";
import { ProjectsList } from "@/components/project/projects-list";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";

export default function ProjectsPage() {
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { t } = useT("projects");

  const goCreate = useCallback(() => {
    if (wsSlug) router.push(`/${wsSlug}/project/new`);
  }, [wsSlug]);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerRight: () => (
            <IconButton
              name="add"
              onPress={goCreate}
              accessibilityLabel={t("navigation:routes.new_project")}
            />
          ),
        }}
      />
      <ProjectsList />
    </View>
  );
}
