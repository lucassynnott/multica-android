/**
 * Agent picker — Modal listing agents the current user can assign /
 * chat with. Shown when the user taps `+ New Chat` and the workspace has
 * more than one usable agent; with exactly one, the chat screen skips this
 * sheet and goes straight to the blank state for that agent.
 *
 * Filtering is delegated to the caller (the screen passes a pre-filtered
 * `agents` list) so the same filter logic — archived + canAssignAgentToIssue
 * + order — stays in one place.
 *
 * Layout: transparent Modal + dimmed backdrop + one centred panel of
 * hairline-separated rows (agent tile, name, description).
 */
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Agent } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { cn } from "@/lib/utils";
import { isAgentRuntimeBound } from "@/lib/is-agent-runtime-bound";
import { useT } from "@/lib/i18n";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface Props {
  visible: boolean;
  agents: Agent[];
  currentAgentId: string | null;
  onPick: (agent: Agent) => void;
  onClose: () => void;
}

export function AgentPickerSheet({
  visible,
  agents,
  currentAgentId,
  onPick,
  onClose,
}: Props) {
  const { t } = useT("chat");
  const { colorScheme } = useColorScheme();
  const foreground = THEME[colorScheme].foreground;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/60" onPress={onClose}>
        <View className="flex-1 items-center justify-center px-5">
          <Pressable onPress={() => {}} className="w-full max-w-sm">
            <View className="overflow-hidden rounded-lg border border-border bg-card">
              <View className="min-h-12 justify-center border-b border-border px-5">
                <Text
                  role="heading"
                  className="text-[15px] font-semibold text-foreground"
                >
                  {t("picker.title")}
                </Text>
              </View>

              <ScrollView className="max-h-96">
                {agents.length === 0 ? (
                  <View className="px-5 py-8">
                    <Text className="text-center text-[13px] text-muted-foreground">
                      {t("picker.empty")}
                    </Text>
                  </View>
                ) : (
                  agents.map((agent, index) => {
                    const selected = agent.id === currentAgentId;
                    const runtimeBound = isAgentRuntimeBound(agent);
                    return (
                      <Pressable
                        key={agent.id}
                        disabled={!runtimeBound}
                        onPress={() => {
                          onPick(agent);
                          onClose();
                        }}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected,
                          disabled: !runtimeBound,
                        }}
                        className={cn(
                          "min-h-14 flex-row items-center gap-3 px-5 py-2.5 active:bg-secondary",
                          index > 0 && "border-t border-border",
                          !runtimeBound && "opacity-50",
                        )}
                      >
                        <ActorAvatar
                          type="agent"
                          id={agent.id}
                          size={32}
                          showPresence
                        />
                        <View className="flex-1">
                          <Text
                            className={cn(
                              "text-[15px] leading-[21px] text-foreground",
                              selected && "font-semibold",
                            )}
                            numberOfLines={1}
                          >
                            {agent.name}
                          </Text>
                          {agent.description ? (
                            <Text
                              className="text-[13px] leading-[18px] text-muted-foreground"
                              numberOfLines={1}
                            >
                              {agent.description}
                            </Text>
                          ) : null}
                        </View>
                        {!runtimeBound ? (
                          <Text className="font-mono text-xs text-muted-foreground">
                            {t("picker.needs_runtime")}
                          </Text>
                        ) : null}
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={18}
                            color={foreground}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
