/**
 * Settings page — profile, notification routing, workspace switching,
 * language, and sign out. Reached from the account row on the More tab.
 *
 * Subscreens push under more/settings/:
 *   - more/settings/profile        — edit name + avatar
 *   - more/settings/notifications  — Inbox routing per kind + system toggle
 *
 * Appearance (theme, background texture) lives on the More tab, not here:
 * `useColorScheme` keeps the chosen preference in per-screen state, so two
 * mounted screens that both edit it would show each other a stale value.
 *
 * Graphite row language: plain 52dp rows with hairlines and 13/600 section
 * labels, no cards around the groups (`components/ui/list-row.tsx`).
 */
import { Alert, ActivityIndicator, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { Workspace } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ListRow, ListSectionLabel } from "@/components/ui/list-row";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { WorkspaceAvatar } from "@/components/workspace/workspace-avatar";
import { workspaceListOptions } from "@/data/queries/workspaces";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { useLocalePreference, useT, type LocalePreference } from "@/lib/i18n";

const LANGUAGE_OPTIONS: LocalePreference[] = [
  "system",
  "en",
  "zh-Hans",
  "zh-Hant",
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const currentSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
  const clearWorkspace = useWorkspaceStore((s) => s.clear);
  const { data, isLoading, error } = useQuery(workspaceListOptions());
  const { colorScheme } = useColorScheme();
  const {
    preference: localePreference,
    setPreference: setLocalePreference,
  } = useLocalePreference();
  const { t } = useT("settings");
  const { t: tCommon } = useT();
  const theme = THEME[colorScheme];
  const localeLabels = {
    system: t("language.system"),
    en: t("language.english"),
    "zh-Hans": t("language.chinese_simplified"),
    "zh-Hant": t("language.chinese_traditional"),
  };

  const onSwitch = async (ws: Workspace) => {
    if (ws.slug === currentSlug) return;
    await setCurrentWorkspace(ws.id, ws.slug);
    router.replace(`/${ws.slug}/inbox`);
  };

  const onSignOut = () => {
    Alert.alert(
      t("account.sign_out"),
      t("account.sign_out_message"),
      [
        { text: tCommon("actions.cancel"), style: "cancel" },
        {
          text: t("account.sign_out"),
          style: "destructive",
          onPress: async () => {
            await clearWorkspace();
            await logout();
          },
        },
      ],
    );
  };

  const goProfile = () => router.push(`/${currentSlug}/more/settings/profile`);
  const goNotifications = () =>
    router.push(`/${currentSlug}/more/settings/notifications`);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-6">
      <ListSectionLabel>{t("account.title")}</ListSectionLabel>
      <ListRow
        onPress={goProfile}
        leading={
          <ActorAvatar
            type="member"
            id={user?.id}
            name={user?.name ?? user?.email ?? undefined}
            avatarUrl={user?.avatar_url ?? null}
            size={36}
          />
        }
        label={user?.name ?? "—"}
        emphasized
        description={user?.email}
      />
      <ListRow
        onPress={goNotifications}
        label={t("notifications.title")}
        description={t("account.notifications_subtitle")}
      />

      <ListSectionLabel>{t("account.workspaces")}</ListSectionLabel>
      {isLoading ? (
        <View className="py-4 items-center">
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View className="px-5 py-3">
          <Text className="text-[13px] text-destructive">
            {t("account.load_failed")}
          </Text>
        </View>
      ) : (
        data?.map((ws) => {
          const isActive = ws.slug === currentSlug;
          return (
            <ListRow
              key={ws.id}
              label={ws.name}
              emphasized={isActive}
              value={`/${ws.slug}`}
              valueMono
              leading={
                <WorkspaceAvatar
                  name={ws.name}
                  avatarUrl={ws.avatar_url}
                  size={24}
                />
              }
              disabled={isActive}
              chevron={!isActive}
              accessibilityState={{ selected: isActive }}
              trailing={isActive ? <Check color={theme.primary} /> : undefined}
              onPress={() => onSwitch(ws)}
            />
          );
        })
      )}

      <ListSectionLabel>{t("language.title")}</ListSectionLabel>
      {LANGUAGE_OPTIONS.map((opt) => {
        const selected = opt === localePreference;
        return (
          <ListRow
            key={opt}
            label={localeLabels[opt]}
            emphasized={selected}
            chevron={false}
            accessibilityState={{ selected }}
            trailing={selected ? <Check color={theme.primary} /> : undefined}
            onPress={() => setLocalePreference(opt)}
          />
        );
      })}

      <ListRow
        className="mt-5 border-t"
        label={t("account.sign_out")}
        destructive
        chevron={false}
        onPress={onSignOut}
      />
    </ScrollView>
  );
}

/** The current choice in a list of options: one accent check, nothing else. */
function Check({ color }: { color: string }) {
  return <PlatformIcon sf="checkmark" ion="checkmark" color={color} size={18} />;
}
