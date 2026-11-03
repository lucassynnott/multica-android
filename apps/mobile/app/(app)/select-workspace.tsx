import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-4 pt-4 pb-6">
        <View className="gap-1">
          <Text className="text-[11px] font-medium text-muted-foreground">
            {t("auth.signed_in_as")}
          </Text>
          <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
            {user?.email}
          </Text>
        </View>

        <Text className="mt-4 text-[22px] font-semibold tracking-tight text-foreground">
          {t("title")}
        </Text>

        {isLoading ? (
          <View className="py-8 items-center">
            <ActivityIndicator />
          </View>
        ) : error ? (
          <View className="mt-4 gap-3">
            <Text className="text-[13px] text-destructive">
              {t("errors.load_failed", {
                message: error instanceof Error ? error.message : "unknown",
              })}
            </Text>
            <Button variant="outline" onPress={() => refetch()}>
              <Text>{t("common:actions.retry")}</Text>
            </Button>
          </View>
        ) : !data || data.length === 0 ? (
          <Text className="mt-4 text-[13px] text-muted-foreground">
            {t("empty")}
          </Text>
        ) : (
          <View className="mt-6 rounded-lg border border-border bg-card overflow-hidden">
              {data.map((ws, idx) => (
                <View key={ws.id}>
                  <Pressable
                    onPress={() => onSelect(ws.id, ws.slug)}
                    className="flex-row items-center gap-3 px-3 py-3 active:bg-secondary"
                    accessibilityRole="button"
                  >
                    <View className="flex-1">
                      <Text
                        className="text-sm font-medium text-foreground"
                        numberOfLines={1}
                      >
                        {ws.name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-muted-foreground">
                        /{ws.slug}
                      </Text>
                      {ws.description ? (
                        <Text className="mt-1 text-xs text-muted-foreground">
                          {ws.description}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={mutedFg} />
                  </Pressable>
                  {idx !== data.length - 1 ? <Separator /> : null}
                </View>
              ))}
          </View>
        )}

        <View className="mt-6">
          <Button variant="outline" onPress={() => logout()}>
            <Text>{t("actions.sign_out")}</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
