/**
 * Inline notice rendered above the chat input when the active agent's
 * runtime isn't reachable. Mirror of
 * `packages/views/chat/components/offline-banner.tsx`.
 *
 * Two states render copy:
 *   - `unstable` (runtime offline < 5 min) → "may reconnect"
 *   - `offline`  (runtime offline ≥ 5 min) → "won't run until back"
 *
 * Both are a hairline-bordered row, not a filled box: the icon tells the two
 * apart and the text stays neutral.
 *
 * Loading silence: `undefined` and the implicit "online" case render nothing.
 * The chat composer never sees a speculative offline flash during the cold
 * fetch window — copy only appears when there's a real-world implication for
 * the message the user is about to send.
 */
import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import type { AgentAvailability } from "@multica/core/agents";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface Props {
  /** Display name for the copy. */
  agentName?: string;
  /**
   * Resolved presence availability. Pass `undefined` to suppress the banner
   * — we only surface known offline / unstable states, never speculative
   * copy during loading.
   */
  availability: AgentAvailability | undefined;
}

export function OfflineBanner({ agentName, availability }: Props) {
  const { t } = useT("chat");
  if (availability !== "offline" && availability !== "unstable") return null;
  const name = agentName?.trim() || t("title.this_agent");

  if (availability === "unstable") {
    return (
      <ChatNoticeRow
        icon="alert-circle-outline"
        text={t("banners.offline_unstable", { name })}
      />
    );
  }

  return (
    <ChatNoticeRow
      icon="cloud-offline-outline"
      text={t("banners.offline", { name })}
    />
  );
}

/** One hairline-topped notice row above the composer. */
export function ChatNoticeRow({
  icon,
  text,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  text: string;
}) {
  const { colorScheme } = useColorScheme();
  return (
    <View
      className="min-h-11 flex-row items-center gap-2.5 border-t border-border px-5 py-2.5"
      accessibilityRole="alert"
    >
      <Ionicons
        name={icon}
        size={16}
        color={THEME[colorScheme].mutedForeground}
      />
      <Text className="flex-1 text-[13px] leading-[18px] text-muted-foreground">
        {text}
      </Text>
    </View>
  );
}
