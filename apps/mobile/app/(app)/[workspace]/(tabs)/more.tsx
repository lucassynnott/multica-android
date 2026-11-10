/**
 * More tab — everything that is not one of the four working destinations.
 *
 * One plain list (mockup: AppMore): the account row, the workspace, the
 * secondary destinations (Pinned, Issues, Projects, Agents, Notifications),
 * an Appearance group, and Sign out. It replaces the popover that used to
 * open from the More item, which hid half the app behind an overflow menu and
 * had no room for preferences.
 *
 * This is a tab root, so it renders the in-body `Header` and the background
 * texture. Every row pushes a route that already existed; the lists it reads
 * (workspaces, projects, agents) are the same cached queries their own
 * screens use, read here only for the trailing value.
 */
import { useMemo } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/ui/header";
import { ListRow, ListSectionLabel } from "@/components/ui/list-row";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { TideTexture } from "@/components/ui/tide-texture";
import { agentListOptions } from "@/data/queries/agents";
import { projectListOptions } from "@/data/queries/projects";
import { workspaceListOptions } from "@/data/queries/workspaces";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useTextureStore } from "@/data/stores/texture-store";
import { ActionSheet } from "@/lib/action-sheet";
import { useT } from "@/lib/i18n";
import { THEME } from "@/lib/theme";
import {
  useColorScheme,
  type ThemePreference,
} from "@/lib/use-color-scheme";

const THEME_OPTIONS: ThemePreference[] = ["light", "dark", "system"];
const MAX_AGENT_AVATARS = 3;

export default function MoreTab() {
  const slug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const clearWorkspace = useWorkspaceStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const textureEnabled = useTextureStore((s) => s.enabled);
  const setTextureEnabled = useTextureStore((s) => s.setEnabled);
  const { preference, setPreference, colorScheme } = useColorScheme();
  const { t } = useT("navigation");
  const { t: tSettings } = useT("settings");
  const { t: tCommon } = useT();
  const theme = THEME[colorScheme];

  const { data: workspaces } = useQuery(workspaceListOptions());
  const { data: projects } = useQuery(projectListOptions(wsId));
  const { data: agents } = useQuery(agentListOptions(wsId));

  const currentWorkspace = useMemo(
    () => (slug ? workspaces?.find((w) => w.slug === slug) : undefined),
    [workspaces, slug],
  );
  const canSwitch = (workspaces?.length ?? 0) > 1;
  const agentPreview = useMemo(
    () =>
      (agents ?? [])
        .filter((agent) => !agent.archived_at)
        .slice(0, MAX_AGENT_AVATARS),
    [agents],
  );

  const go = (path: string) => {
    if (slug) router.push(`/${slug}${path}`);
  };

  const onPickTheme = () => {
    const options = [
      ...THEME_OPTIONS.map((opt) => tSettings(`appearance.${opt}`)),
      tCommon("actions.cancel"),
    ];
    const cancelButtonIndex = options.length - 1;
    ActionSheet.showActionSheetWithOptions(
      {
        title: tSettings("appearance.theme"),
        options,
        cancelButtonIndex,
      },
      (index) => {
        const next = THEME_OPTIONS[index];
        if (next) setPreference(next);
      },
    );
  };

  const onSignOut = () => {
    Alert.alert(
      tSettings("account.sign_out"),
      tSettings("account.sign_out_message"),
      [
        { text: tCommon("actions.cancel"), style: "cancel" },
        {
          text: tSettings("account.sign_out"),
          style: "destructive",
          onPress: async () => {
            await clearWorkspace();
            await logout();
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-background">
      <TideTexture height={240} />
      <Header title={t("tabs.more")} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Account: the one two-line row, with a 44dp avatar. */}
        <Pressable
          onPress={() => go("/more/settings")}
          accessibilityRole="button"
          accessibilityLabel={t("more_menu.account_settings")}
          className="flex-row items-center gap-3.5 border-b border-border px-5 pb-4 pt-3 active:bg-secondary"
        >
          <ActorAvatar
            type="member"
            id={user?.id}
            name={user?.name ?? user?.email ?? undefined}
            avatarUrl={user?.avatar_url ?? null}
            size={44}
          />
          <View className="flex-1 gap-0.5">
            <Text
              className="text-[15px] font-semibold leading-[21px] text-foreground"
              numberOfLines={1}
            >
              {user?.name ?? "—"}
            </Text>
            {user?.email ? (
              <Text
                className="font-mono text-xs text-muted-foreground"
                numberOfLines={1}
              >
                {user.email}
              </Text>
            ) : null}
          </View>
          <PlatformIcon
            sf="chevron.right"
            ion="chevron-forward"
            color={theme.mutedForeground}
            size={16}
          />
        </Pressable>

        <ListRow
          label={tSettings("account.workspace")}
          value={currentWorkspace?.name}
          // With a single workspace there is nothing to switch to: the row
          // still names the workspace but does not lead anywhere.
          onPress={canSwitch ? () => go("/switch-workspace") : undefined}
          accessibilityLabel={
            canSwitch ? tSettings("workspace.switch") : undefined
          }
        />
        <ListRow label={t("more_menu.pinned")} onPress={() => go("/more/pins")} />
        <ListRow
          label={t("more_menu.issues")}
          onPress={() => go("/more/issues")}
        />
        <ListRow
          label={t("more_menu.projects")}
          value={projects && projects.length > 0 ? String(projects.length) : undefined}
          valueMono
          onPress={() => go("/more/projects")}
        />
        <ListRow
          label={t("more_menu.agents")}
          trailing={
            agentPreview.length > 0 ? (
              <View className="flex-row gap-1">
                {agentPreview.map((agent) => (
                  <ActorAvatar
                    key={agent.id}
                    type="agent"
                    id={agent.id}
                    size={24}
                  />
                ))}
              </View>
            ) : undefined
          }
          onPress={() => go("/more/agents")}
        />
        <ListRow
          label={t("more_menu.notifications")}
          onPress={() => go("/more/settings/notifications")}
        />

        <ListSectionLabel>{tSettings("appearance.title")}</ListSectionLabel>
        <ListRow
          label={tSettings("appearance.theme")}
          value={tSettings(`appearance.${preference}`)}
          onPress={onPickTheme}
        />
        {/* The row and the switch both toggle. The inner control wins the
            responder, so a tap fires exactly one of them. */}
        <ListRow
          label={tSettings("appearance.texture")}
          description={tSettings("appearance.texture_description")}
          chevron={false}
          className="min-h-[60px]"
          accessibilityRole="switch"
          accessibilityState={{ checked: textureEnabled }}
          onPress={() => setTextureEnabled(!textureEnabled)}
          trailing={
            <Switch
              checked={textureEnabled}
              onCheckedChange={setTextureEnabled}
              accessibilityLabel={tSettings("appearance.texture")}
            />
          }
        />

        <ListRow
          label={tSettings("account.sign_out")}
          destructive
          chevron={false}
          divider={false}
          onPress={onSignOut}
        />
      </ScrollView>
    </View>
  );
}
