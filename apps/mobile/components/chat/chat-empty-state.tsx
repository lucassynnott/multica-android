/**
 * Empty-state surface shown when the active session has no messages.
 *
 * Two modes mirror web (packages/views/chat/components/chat-window.tsx
 * `EmptyState`):
 *
 *   - first-time (the workspace has never started a chat) → educate and
 *     offer conversation starters so the composer is not a blank dead end.
 *   - returning (at least one prior session exists) → lead with starter
 *     starters. Tapping prefills the draft so the user can edit before sending.
 */
import { Pressable, View } from "react-native";
import type { Agent, AgentConversationStarter } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { useT } from "@/lib/i18n";

const FALLBACK_CONVERSATION_STARTER_KEYS = [
  { labelKey: "empty.starter_help_label", promptKey: "empty.starter_help_prompt" },
  { labelKey: "empty.starter_task_label", promptKey: "empty.starter_task_prompt" },
  { labelKey: "empty.starter_action_label", promptKey: "empty.starter_action_prompt" },
] as const;

interface Props {
  hasSessions: boolean;
  agent: Agent | null;
  onPickPrompt: (text: string) => void;
}

export function ChatEmptyState({ hasSessions, agent, onPickPrompt }: Props) {
  const { t } = useT("chat");
  const title = agent
    ? t("empty.greeting", { name: agent.name })
    : t("empty.no_agent_title");
  const configured = (agent?.conversation_starters ?? []).filter(
    (item) => item.label.trim() && item.prompt.trim(),
  );
  const fallbackStarters: AgentConversationStarter[] = FALLBACK_CONVERSATION_STARTER_KEYS.map(
    (starter) => ({
      label: t(starter.labelKey),
      prompt: t(starter.promptKey),
    }),
  );
  const starters = configured.length > 0 ? configured : fallbackStarters;
  return (
    <View className="flex-1 justify-center px-5 py-8">
      <View className="w-full max-w-[420px] gap-6 self-center">
        <View className="gap-2">
          {agent ? (
            <View className="mb-1">
              <ActorAvatar type="agent" id={agent.id} size={40} />
            </View>
          ) : null}
          <Text className="text-xl font-semibold text-foreground">
            {title}
          </Text>
          {agent?.description ? (
            <Text className="text-[15px] leading-[22px] text-muted-foreground">
              {agent.description}
            </Text>
          ) : null}
          {!hasSessions ? (
            <Text className="text-[13px] leading-[19px] text-muted-foreground">
              {t("empty.examples")}
            </Text>
          ) : null}
        </View>
        {agent ? (
          <View className="gap-2">
            {starters.map((item, index) => (
              <Pressable
                key={index}
                onPress={() => onPickPrompt(item.prompt)}
                className="min-h-11 flex-row items-center rounded-lg border border-border px-3.5 py-2.5 active:bg-secondary"
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Text className="flex-1 text-[15px] leading-[21px] text-foreground">
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
