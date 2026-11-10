/**
 * The projects list body, shared by the Projects tab and the Projects entry
 * under More.
 *
 * Both screens own their own chrome (the tab renders the in-body `Header`, the
 * pushed screen keeps the native Stack header), so the list lives here once.
 * The two must not drift: same sort, same card, same empty state.
 *
 * Sort: client-side by `updated_at` desc, most recently touched at top.
 * Mirrors web's default list ordering. WS `project:*` events keep the cache
 * fresh through the listing-level realtime hook in the workspace layout, so
 * pull-to-refresh is only for the cellular-edge case where a reconnect missed
 * events.
 *
 * Layout: hairline-separated rows on the 20dp gutter. Loading, empty and
 * error states only replace the list when there is no data to show.
 */
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ProjectRow } from "@/components/project/project-row";
import { projectListOptions } from "@/data/queries/projects";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";

export function ProjectsList() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { t } = useT("projects");

  const { data, isLoading, error, refetch, isRefetching } = useQuery(
    projectListOptions(wsId),
  );

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  }, [data]);

  const openProject = useCallback(
    (id: string) => {
      if (wsSlug) router.push(`/${wsSlug}/project/${id}`);
    },
    [wsSlug],
  );

  const goCreate = useCallback(() => {
    if (wsSlug) router.push(`/${wsSlug}/project/new`);
  }, [wsSlug]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View className="gap-3 px-5 pt-6">
        <Text className="text-[15px] leading-[21px] text-foreground">
          {t("errors.load_failed", {
            message: error instanceof Error ? error.message : "unknown",
          })}
        </Text>
        <Button
          variant="outline"
          className="min-h-11 self-start"
          onPress={() => refetch()}
        >
          <Text>{t("common:actions.retry")}</Text>
        </Button>
      </View>
    );
  }

  return (
    <FlatList
      data={sorted}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
      ItemSeparatorComponent={() => <View className="h-px bg-border" />}
      renderItem={({ item }) => (
        <ProjectRow project={item} onPress={() => openProject(item.id)} />
      )}
      ListEmptyComponent={
        <View className="gap-3 px-5 pt-6">
          <Text className="text-[15px] leading-[21px] text-muted-foreground">
            {t("list.empty")}
          </Text>
          <Button className="min-h-11 self-start" onPress={goCreate}>
            <Text>{t("common:actions.create")}</Text>
          </Button>
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    />
  );
}
