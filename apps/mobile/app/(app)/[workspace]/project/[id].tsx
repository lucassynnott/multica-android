/**
 * Project detail screen. Two views of the same record, switched in place:
 *
 *   Overview — title block, property list, resources, related issues
 *   Board    — the kanban for this project's issues (`ProjectBoard`)
 *
 * The switch is a segmented control under the navigation bar rather than a
 * nested tab bar: the project is one record with two readings, so it should not
 * grow a second navigation layer that competes with the bottom tabs.
 *
 * Per-record realtime: `useProjectRealtime(id, onDeleted=back)` subscribes to
 * `project:updated` (full replace) and `project:deleted` (pop back).
 *
 * Right-top "…" menu → Edit / Delete. Delete asks for confirmation via
 * `Alert.alert`; destructive actions need a second tap.
 */
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { ActionSheet } from "@/lib/action-sheet";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TideTexture } from "@/components/ui/tide-texture";
import { ProjectHeaderCard } from "@/components/project/project-header-card";
import { ProjectPropertiesSection } from "@/components/project/project-properties-section";
import { ProjectRelatedIssues } from "@/components/project/project-related-issues";
import { ProjectResourcesSection } from "@/components/project/project-resources-section";
import { ProjectBoard } from "@/components/project/project-board";
import {
  projectDetailOptions,
  projectResourcesOptions,
} from "@/data/queries/projects";
import { issueKeys } from "@/data/queries/issue-keys";
import { useDeleteProject } from "@/data/mutations/projects";
import { pinListOptions } from "@/data/queries/pins";
import { useCreatePin, useDeletePin } from "@/data/mutations/pins";
import { useAuthStore } from "@/data/auth-store";
import { useProjectRealtime } from "@/data/realtime/use-project-realtime";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";

type ProjectView = "overview" | "board";

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const qc = useQueryClient();
  const [view, setView] = useState<ProjectView>("overview");

  const detail = useQuery(projectDetailOptions(wsId, id));
  const deleteProject = useDeleteProject(id);

  // Per-record realtime — when another client deletes the project we're
  // viewing, pop back so the user isn't stranded on a 404.
  useProjectRealtime(id, () => router.back());

  const onRefresh = useCallback(async () => {
    await Promise.all([
      detail.refetch(),
      qc.invalidateQueries({
        queryKey: projectResourcesOptions(wsId, id).queryKey,
      }),
      qc.invalidateQueries({
        queryKey: [...issueKeys.list(wsId), "byProject", id],
      }),
    ]);
  }, [detail, qc, wsId, id]);

  const project = detail.data;

  // EMPTY_PROJECT carries an empty id — parseWithFallback returned the
  // fallback because the response shape drifted. Treat as "not found".
  const projectMissing = !project || project.id === "";

  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { data: pins } = useQuery(pinListOptions(wsId, userId));
  const isPinned =
    !!project &&
    !!pins?.some(
      (p) => p.item_type === "project" && p.item_id === project.id,
    );
  const createPin = useCreatePin();
  const deletePin = useDeletePin();
  const { t } = useT("projects");

  const onDelete = useCallback(() => {
    Alert.alert(t("delete.title"), t("delete.message"), [
      { text: t("common:actions.cancel"), style: "cancel" },
      {
        text: t("common:actions.delete"),
        style: "destructive",
        onPress: () => {
          deleteProject.mutate(undefined, {
            onSuccess: () => router.back(),
          });
        },
      },
    ]);
  }, [deleteProject, t]);

  const onPressMore = () => {
    if (!project) return;
    const wsUrl = process.env.EXPO_PUBLIC_WEB_URL;
    const actions = ["cancel", isPinned ? "unpin" : "pin", "edit"];
    if (wsUrl) actions.push("open_web");
    actions.push("delete");
    const options = actions.map((action) =>
      action === "cancel"
        ? t("common:actions.cancel")
        : action === "pin"
          ? t("menu.pin")
          : action === "unpin"
            ? t("menu.unpin")
            : action === "edit"
              ? t("menu.edit_details")
              : action === "open_web"
                ? t("menu.open_web")
                : t("common:actions.delete"),
    );
    const destructiveIndex = options.length - 1;
    ActionSheet.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 0,
        destructiveButtonIndex: destructiveIndex,
      },
      (i) => {
        const action = actions[i];
        if (action === "pin") {
          createPin.mutate({ item_type: "project", item_id: project.id });
          return;
        }
        if (action === "unpin") {
          deletePin.mutate({ itemType: "project", itemId: project.id });
          return;
        }
        if (action === "edit") {
          if (wsSlug) router.push(`/${wsSlug}/project/${id}/edit`);
          return;
        }
        if (action === "open_web" && wsUrl) {
          Linking.openURL(`${wsUrl}/${wsSlug}/projects/${id}`);
          return;
        }
        if (i === destructiveIndex) {
          onDelete();
        }
      },
    );
  };

  const viewOptions = [
    { value: "overview" as const, label: t("views.overview") },
    { value: "board" as const, label: t("views.board") },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TideTexture height={300} />
      <Stack.Screen
        options={{
          title: project?.title || t("navigation:routes.project"),
          headerBackTitle: t("common:actions.back"),
          headerRight: project
            ? () => (
                <IconButton
                  name="ellipsis-horizontal"
                  onPress={onPressMore}
                  accessibilityLabel={t("menu.project_actions")}
                />
              )
            : undefined,
        }}
      />
      {detail.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : projectMissing ? (
        <View className="gap-3 px-5 pt-6">
          <Text className="text-[15px] leading-[21px] text-foreground">
            {t("errors.load_failed", {
              message:
                detail.error instanceof Error
                  ? detail.error.message
                  : "not found",
            })}
          </Text>
          <Button
            variant="outline"
            className="min-h-11 self-start"
            onPress={() => detail.refetch()}
          >
            <Text>{t("common:actions.retry")}</Text>
          </Button>
        </View>
      ) : (
        <View className="flex-1">
          <View className="px-5 pb-3 pt-2">
            <SegmentedControl
              options={viewOptions}
              value={view}
              onChange={setView}
            />
          </View>

          {view === "board" ? (
            <ProjectBoard projectId={id} />
          ) : (
            <ScrollView
              contentContainerStyle={{ paddingBottom: 40 }}
              refreshControl={
                <RefreshControl
                  refreshing={detail.isRefetching}
                  onRefresh={onRefresh}
                />
              }
              keyboardDismissMode="on-drag"
            >
              <ProjectHeaderCard
                project={project}
                onEdit={() => {
                  if (wsSlug) router.push(`/${wsSlug}/project/${id}/edit`);
                }}
              />
              <ProjectPropertiesSection
                project={project}
                onPressStatus={() => {
                  if (wsSlug)
                    router.push({
                      pathname: "/[workspace]/project/[id]/picker/status",
                      params: { workspace: wsSlug, id },
                    });
                }}
                onPressPriority={() => {
                  if (wsSlug)
                    router.push({
                      pathname: "/[workspace]/project/[id]/picker/priority",
                      params: { workspace: wsSlug, id },
                    });
                }}
                onPressLead={() => {
                  if (wsSlug)
                    router.push({
                      pathname: "/[workspace]/project/[id]/picker/lead",
                      params: { workspace: wsSlug, id },
                    });
                }}
              />
              <View className="h-4" />
              <ProjectResourcesSection
                projectId={id}
                onAdd={() => {
                  if (wsSlug)
                    router.push({
                      pathname: "/[workspace]/project/[id]/add-resource",
                      params: { workspace: wsSlug, id },
                    });
                }}
              />
              <ProjectRelatedIssues projectId={id} />
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
