/**
 * Projects tab — the workspace's projects, one tap from anywhere.
 *
 * This is a tab root, so it renders the in-body `Header` (see
 * `components/ui/header.tsx`) rather than a native Stack header. The list body
 * is shared with the Projects entry under More via `ProjectsList`.
 */
import { useQuery } from "@tanstack/react-query";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "@/components/ui/header";
import { ProjectsList } from "@/components/project/projects-list";
import { projectListOptions } from "@/data/queries/projects";
import { useWorkspaceStore } from "@/data/workspace-store";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";
import { useT } from "@/lib/i18n";

export default function ProjectsTab() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { t } = useT("projects");
  const { t: tNav } = useT("navigation");
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme];

  const { data } = useQuery(projectListOptions(wsId));
  const count = data?.length ?? 0;

  return (
    <View className="flex-1 bg-background">
      <Header
        title={tNav("tabs.projects")}
        subtitle={
          count > 0 ? t("list.count", { count, defaultValue: "{{count}}" }) : undefined
        }
        right={
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={tNav("routes.new_project")}
            className="w-10 h-10 items-center justify-center rounded-md active:bg-secondary"
            onPress={() => {
              if (wsSlug) router.push(`/${wsSlug}/project/new`);
            }}
          >
            <Ionicons name="add" size={22} color={theme.foreground} />
          </Pressable>
        }
      />
      <ProjectsList />
    </View>
  );
}
