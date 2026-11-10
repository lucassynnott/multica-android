/**
 * Project resources section. Read-mostly list of typed external pointers
 * (today: GitHub repos). Tap a row to open the URL in the system browser.
 * Long-press for delete (Pressable's onLongPress).
 *
 * A DESIGN.md "Group header" (44dp, top hairline, name 13/600, mono count)
 * with the "Add" action as its trailing control, then plain rows.
 *
 * Schema-tolerant by design — `resource_ref` is typed `unknown` in the
 * mobile schema (server may extend the shape per resource_type). We narrow
 * via `getRepoUrl()` only when the dispatch knows the type, so a future
 * resource_type renders as a generic row with the label instead of crashing.
 */
import { ActivityIndicator, Alert, Linking, Pressable, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type {
  GithubRepoResourceRef,
  ProjectResource,
} from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { projectResourcesOptions } from "@/data/queries/projects";
import { useDeleteProjectResource } from "@/data/mutations/projects";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { useT } from "@/lib/i18n";

interface Props {
  projectId: string;
  onAdd: () => void;
}

export function ProjectResourcesSection({ projectId, onAdd }: Props) {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { t } = useT("projects");
  const { data: resources, isLoading } = useQuery(
    projectResourcesOptions(wsId, projectId),
  );

  const onOpen = async (resource: ProjectResource) => {
    const url = getResourceUrl(resource);
    if (!url) return;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  return (
    <View>
      <View className="h-11 flex-row items-center gap-2.5 border-t border-border pl-5 pr-2">
        <Text className="text-[13px] font-semibold text-foreground">
          {t("resources.title")}
        </Text>
        {resources && resources.length > 0 ? (
          <Text className="font-mono text-xs text-muted-foreground">
            {resources.length}
          </Text>
        ) : null}
        <View className="flex-1" />
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          className="h-11 min-w-11 items-center justify-center rounded-lg px-3 active:bg-secondary"
        >
          <Text className="text-[13px] font-semibold text-primary">
            {t("resources.add")}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="items-center py-6">
          <ActivityIndicator size="small" />
        </View>
      ) : !resources || resources.length === 0 ? (
        <Text className="px-5 pb-3 text-[13px] text-muted-foreground">
          {t("resources.empty")}
        </Text>
      ) : (
        resources.map((resource) => (
          <ResourceRow
            key={resource.id}
            resource={resource}
            onPress={() => onOpen(resource)}
          />
        ))
      )}
    </View>
  );
}

function ResourceRow({
  resource,
  onPress,
}: {
  resource: ProjectResource;
  onPress: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const { t } = useT("projects");
  const remove = useDeleteProjectResource(resource.project_id);
  const onLongPress = () => {
    if (remove.isPending) return;
    Alert.alert(
      t("resources.detach_title"),
      describeResource(resource),
      [
        { text: t("common:actions.cancel"), style: "cancel" },
        {
          text: t("resources.detach"),
          style: "destructive",
          onPress: () => remove.mutate(resource.id),
        },
      ],
    );
  };
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={remove.isPending}
      accessibilityState={{ disabled: remove.isPending, busy: remove.isPending }}
      delayLongPress={400}
      className="min-h-11 flex-row items-start gap-3 px-5 py-2.5 active:bg-secondary"
    >
      <View className="h-[21px] w-5 items-center justify-center">
        {remove.isPending ? (
          <ActivityIndicator size="small" />
        ) : (
          <Ionicons
            name={iconFor(resource.resource_type)}
            size={18}
            color={THEME[colorScheme].mutedForeground}
          />
        )}
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text
          className="text-[15px] leading-[21px] text-foreground"
          numberOfLines={1}
        >
          {resource.label ?? describeResource(resource)}
        </Text>
        {resource.label ? (
          <Text
            className="font-mono text-xs text-muted-foreground"
            numberOfLines={1}
          >
            {describeResource(resource)}
          </Text>
        ) : null}
        {/* Its own line rather than appended to the URL: a custom label already
            takes the first slot, and this is the one project setting that
            silently changes what every task starts from. */}
        {checkoutRefOf(resource) ? (
          <View className="flex-row items-center gap-1">
            <Ionicons
              name="git-branch-outline"
              size={12}
              color={THEME[colorScheme].mutedForeground}
            />
            <Text
              className="font-mono text-xs text-muted-foreground"
              numberOfLines={1}
            >
              {checkoutRefOf(resource)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function iconFor(type: string): keyof typeof Ionicons.glyphMap {
  if (type === "github_repo") return "logo-github";
  return "link-outline";
}

function getResourceUrl(resource: ProjectResource): string | null {
  if (resource.resource_type === "github_repo") {
    const ref = resource.resource_ref as GithubRepoResourceRef | undefined;
    return ref?.url ?? null;
  }
  // Unknown type — try a `.url` field as a generic fallback.
  const ref = resource.resource_ref as { url?: unknown } | undefined;
  return typeof ref?.url === "string" ? ref.url : null;
}

function describeResource(resource: ProjectResource): string {
  return getResourceUrl(resource) ?? resource.resource_type;
}

/**
 * The repo's pinned checkout ref, or null when tasks use the default branch.
 *
 * Matches the web/desktop badge in
 * packages/views/projects/components/project-resources-section.tsx — a ref set
 * on any client has to be visible on every client, or the two disagree about
 * what the project is configured to do.
 */
function checkoutRefOf(resource: ProjectResource): string | null {
  if (resource.resource_type !== "github_repo") return null;
  const ref = resource.resource_ref as GithubRepoResourceRef | undefined;
  const value = ref?.ref?.trim();
  return value ? value : null;
}
