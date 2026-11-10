/**
 * Tappable title region for the Chat tab header: the current agent's avatar
 * and name, with the session line under it. Tap opens the sessions sheet.
 */
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Agent, ChatSession } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { useT } from "@/lib/i18n";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface Props {
  currentSession: ChatSession | null;
  currentAgent: Agent | null;
  onPress: () => void;
}

export function ChatTitleButton({
  currentSession,
  currentAgent,
  onPress,
}: Props) {
  const { t } = useT("chat");
  const { colorScheme } = useColorScheme();
  const agentName = currentAgent?.name ?? t("title.fallback");
  const subtitle = currentSession?.title || t("sessions.new_chat");

  return (
    <Pressable
      onPress={onPress}
      className="min-h-12 justify-center gap-0.5 self-start rounded-lg pr-2 active:opacity-70"
      accessibilityRole="button"
      accessibilityLabel={t("a11y.sessions_agent_picker")}
    >
      <View className="flex-row items-center gap-2">
        {currentAgent ? (
          <ActorAvatar
            type="agent"
            id={currentAgent.id}
            size={26}
            showPresence
          />
        ) : null}
        <Text
          className="shrink text-[17px] font-semibold leading-[22px] text-foreground"
          numberOfLines={1}
        >
          {agentName}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={THEME[colorScheme].foreground}
        />
      </View>
      <Text
        className="font-mono text-xs text-muted-foreground"
        numberOfLines={1}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}
