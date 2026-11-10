/**
 * Chat session-switch sheet — presented as a formSheet by the parent Stack.
 * Reads the session list from the chat cache and writes the user's pick
 * through a shared "active session" store so the chat tab picks it up on
 * dismiss.
 *
 * Why a tiny dedicated store: the chat tab's `activeSessionId` used to live
 * as a `useState` inside `chat.tsx`, but now that session picking happens
 * on a separate route screen, we need a cross-screen channel. Same minimum
 * pattern as `useNewIssueDraftStore` for the new-issue form.
 *
 * Each row is two targets: the row itself selects the session, and a trailing
 * 44dp trash button deletes it behind the same confirm the long-press uses.
 */
import { Alert, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { ChatSession } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { chatSessionsOptions } from "@/data/queries/chat";
import { useDeleteChatSession } from "@/data/mutations/chat";
import { useChatSessionPickerStore } from "@/data/stores/chat-session-picker-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { cn } from "@/lib/utils";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { useT } from "@/lib/i18n";

export default function ChatSessionsRoute() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme];
  const { t } = useT("chat");
  const { data: sessions = [] } = useQuery(chatSessionsOptions(wsId));
  const activeSessionId = useChatSessionPickerStore((s) => s.activeSessionId);
  const requestSelect = useChatSessionPickerStore((s) => s.requestSelect);
  const deleteSession = useDeleteChatSession();

  const confirmDelete = (session: ChatSession) => {
    Alert.alert(
      t("alerts.delete_title"),
      session.title || t("sessions.new_chat"),
      [
        { text: t("common:actions.cancel"), style: "cancel" },
        {
          text: t("alerts.delete_confirm"),
          style: "destructive",
          onPress: () => {
            deleteSession.mutate(session.id);
            // If we just deleted the active one, the chat tab clears its
            // local activeSessionId via the picker-store request.
            if (session.id === activeSessionId) {
              requestSelect(null);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-baseline gap-2 px-5 pb-3 pt-5">
        <Text role="heading" className="text-xl font-semibold text-foreground">
          {t("sessions.title")}
        </Text>
        {sessions.length > 0 ? (
          <Text className="font-mono text-[13px] text-muted-foreground">
            {sessions.length}
          </Text>
        ) : null}
      </View>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {sessions.length === 0 ? (
          <View className="px-5 py-8">
            <Text className="text-[13px] text-muted-foreground">
              {t("sessions.empty")}
            </Text>
          </View>
        ) : (
          sessions.map((session) => {
            const selected = session.id === activeSessionId;
            const archived = session.status === "archived";
            const title = session.title || t("sessions.new_chat");
            return (
              <View
                key={session.id}
                className="flex-row items-center border-t border-border"
              >
                <Pressable
                  onPress={() => {
                    requestSelect(session.id);
                    router.back();
                  }}
                  onLongPress={() => confirmDelete(session)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className="min-h-14 flex-1 flex-row items-center gap-3 py-2.5 pl-5 pr-1 active:bg-secondary"
                >
                  <ActorAvatar
                    type="agent"
                    id={session.agent_id}
                    size={32}
                    showPresence
                  />
                  <View className="flex-1">
                    <Text
                      className={cn(
                        "text-[15px] leading-[21px] text-foreground",
                        (session.has_unread || selected) && "font-semibold",
                      )}
                      numberOfLines={1}
                    >
                      {title}
                    </Text>
                    {archived ? (
                      <Text className="font-mono text-xs text-muted-foreground">
                        {t("sessions.archived")}
                      </Text>
                    ) : null}
                  </View>
                  {session.has_unread ? (
                    <View className="h-2 w-2 rounded-full bg-primary" />
                  ) : null}
                  {selected ? (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={theme.foreground}
                    />
                  ) : null}
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(session)}
                  accessibilityRole="button"
                  accessibilityLabel={t("sessions.delete_a11y", { title })}
                  className="mr-2 h-11 w-11 items-center justify-center rounded-lg active:bg-secondary"
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={theme.mutedForeground}
                  />
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
