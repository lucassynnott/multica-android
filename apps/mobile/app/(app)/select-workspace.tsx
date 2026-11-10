import { useEffect, useRef } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { WorkspaceAvatar } from "@/components/workspace/workspace-avatar";
import { workspaceListOptions } from "@/data/queries/workspaces";
import { useAuthStore } from "@/data/auth-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { useT } from "@/lib/i18n";

export default function SelectWorkspace() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
  const { t } = useT("workspace");
  const { colorScheme } = useColorScheme();
  const mutedFg = THEME[colorScheme].mutedForeground;
  const { data, isLoading, error, refetch } = useQuery(workspaceListOptions());

  const onSelect = async (id: string, slug: string) => {
    await setCurrentWorkspace(id, slug);
    router.replace(`/${slug}/inbox`);
  };

  // An account with exactly one workspace has nothing to choose: go straight
  // in instead of showing a one-item list. One-shot, so a failed navigation
  // cannot loop; the spinner below covers the frame before the replace lands.
  const onlyWorkspace = data?.length === 1 ? data[0] : null;
  const autoContinued = useRef(false);
  useEffect(() => {
    if (!onlyWorkspace || autoContinued.current) return;
    autoContinued.current = true;
    void (async () => {
      await setCurrentWorkspace(onlyWorkspace.id, onlyWorkspace.slug);
      router.replace(`/${onlyWorkspace.slug}/inbox`);
    })();
  }, [onlyWorkspace, setCurrentWorkspace]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="pt-6 pb-8">
        {/* Same capped column as sign-in, on the 20dp gutter. */}
        <View className="w-full max-w-[460px] self-center">
          <View className="gap-1 px-5">
            <Text
              role="heading"
              className="text-xl font-semibold text-foreground"
            >
              {t("title")}
            </Text>
            <Text
              className="font-mono text-xs text-muted-foreground"
              numberOfLines={1}
            >
              {user?.email}
            </Text>
          </View>

          {isLoading || onlyWorkspace ? (
            <View className="items-center py-10">
              <ActivityIndicator />
            </View>
          ) : error ? (
            <View className="mt-5 gap-3 px-5">
              <Text className="text-[13px] leading-[19px] text-destructive">
                {t("errors.load_failed", {
                  message: error instanceof Error ? error.message : "unknown",
                })}
              </Text>
              <Button
                variant="outline"
                className="h-11"
                onPress={() => refetch()}
              >
                <Text>{t("common:actions.retry")}</Text>
              </Button>
            </View>
          ) : !data || data.length === 0 ? (
            <Text className="mt-5 px-5 text-[15px] leading-[22px] text-muted-foreground">
              {t("empty")}
            </Text>
          ) : (
            <View className="mt-5 border-b border-border">
              {data.map((ws) => (
                <Pressable
                  key={ws.id}
                  onPress={() => onSelect(ws.id, ws.slug)}
                  className="min-h-14 flex-row items-center gap-3 border-t border-border px-5 py-2.5 active:bg-secondary"
                  accessibilityRole="button"
                  accessibilityLabel={ws.name}
                >
                  <WorkspaceAvatar
                    name={ws.name}
                    avatarUrl={ws.avatar_url}
                    size={32}
                  />
                  <View className="flex-1">
                    <Text
                      className="text-[15px] leading-[21px] text-foreground"
                      numberOfLines={1}
                    >
                      {ws.name}
                    </Text>
                    <Text
                      className="font-mono text-xs text-muted-foreground"
                      numberOfLines={1}
                    >
                      /{ws.slug}
                    </Text>
                    {ws.description ? (
                      <Text
                        className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground"
                        numberOfLines={2}
                      >
                        {ws.description}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={mutedFg} />
                </Pressable>
              ))}
            </View>
          )}

          <View className="mt-6 px-5">
            <Button
              variant="outline"
              className="h-11"
              onPress={() => logout()}
            >
              <Text>{t("actions.sign_out")}</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
