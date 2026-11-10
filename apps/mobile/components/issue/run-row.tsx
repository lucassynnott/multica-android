/**
 * Single row inside the agent-runs formSheet route
 * (`app/(app)/[workspace]/issue/[id]/runs.tsx`). Same component for active
 * and past tasks —
 * the trailing Cancel button is available for every cancellable status,
 * and the status badge / colour swaps based on the AgentTask.status enum.
 *
 * Terminal runs open their persisted execution record. Active rows keep the
 * cancel affordance and are not links: this route is for historical records.
 */
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";
import type { AgentTask } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { RunCancelButton } from "./run-cancel-button";
import { useActorLookup } from "@/data/use-actor-name";
import { runFailureBadgeLabel } from "@/lib/run-failure-badge";
import { timeAgo } from "@/lib/time-ago";
import { useT } from "@/lib/i18n";
import { isCancellableRunStatus, runTranscriptRoute } from "@/lib/run-transcript";
import { useWorkspaceStore } from "@/data/workspace-store";
import { THEME } from "@/lib/theme";

interface Props {
  task: AgentTask;
  issueId: string;
}

const TERMINAL_STATUSES: readonly AgentTask["status"][] = [
  "completed",
  "failed",
  "cancelled",
];

export function RunRow({ task, issueId }: Props) {
  const { getName } = useActorLookup();
  const { t } = useT("issues");
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme === "dark" ? "dark" : "light"];
  const workspace = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const isActive = isCancellableRunStatus(task.status);
  const isTerminal = TERMINAL_STATUSES.includes(task.status);
  const summary =
    task.trigger_summary?.trim() || fallbackSummary(task, t);
  // Past tasks use completed_at when present (server fills it for terminal
  // statuses); active tasks fall back to created_at so the user sees how
  // long it's been waiting.
  const timestamp = task.completed_at || task.created_at;

  const content = (
    <>
      <ActorAvatar type="agent" id={task.agent_id} size={28} showPresence />
      <View className="flex-1 gap-0.5">
        <Text
          className="text-[15px] leading-[21px] text-foreground"
          numberOfLines={2}
        >
          <Text className="text-[15px] font-semibold">
            {getName("agent", task.agent_id)}
          </Text>
          <Text className="text-[15px] text-muted-foreground"> · {summary}</Text>
        </Text>
        <View className="flex-row items-center gap-2">
          <StatusBadge task={task} />
          <Text className="font-mono text-xs text-muted-foreground">
            {timestamp ? timeAgo(timestamp) : ""}
          </Text>
        </View>
      </View>
      {isActive ? <RunCancelButton taskId={task.id} issueId={issueId} /> : null}
      {isTerminal ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={theme.mutedForeground}
        />
      ) : null}
    </>
  );

  if (!isTerminal || !workspace) {
    return (
      <View className="min-h-[52px] flex-row items-center gap-3 px-5 py-2.5">
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("runs.open_transcript", { summary })}
      onPress={() => router.push(runTranscriptRoute(workspace, issueId, task.id))}
      className="min-h-[52px] flex-row items-center gap-3 px-5 py-2.5 active:bg-secondary"
    >
      {content}
    </Pressable>
  );
}

function StatusBadge({ task }: { task: AgentTask }) {
  const { t } = useT("issues");
  const label = t(`runs.status.${task.status}`);
  const cls = STATUS_CLASS[task.status] ?? "text-muted-foreground";
  // For failed tasks, surface the failure_reason inline so users don't have
  // to drill in. Missing / empty / unrecognised stays as just "Failed".
  if (task.status === "failed") {
    const reasonLabel = runFailureBadgeLabel(task.failure_reason);
    if (reasonLabel) {
      return (
        <Text className={`text-[13px] ${cls}`}>
          {label} · {reasonLabel}
        </Text>
      );
    }
  }
  return <Text className={`text-[13px] ${cls}`}>{label}</Text>;
}

function fallbackSummary(
  task: AgentTask,
  t: (key: string) => string,
): string {
  switch (task.kind) {
    case "comment":
      return t("summary.comment");
    case "autopilot":
      return t("summary.autopilot");
    case "chat":
      return t("summary.chat");
    case "quick_create":
      return t("summary.quick_create");
    case "direct":
    default:
      return t("summary.direct");
  }
}

const STATUS_CLASS: Record<AgentTask["status"], string> = {
  queued: "text-muted-foreground",
  deferred: "text-muted-foreground",
  dispatched: "text-foreground",
  waiting_local_directory: "text-muted-foreground",
  running: "text-foreground",
  completed: "text-muted-foreground",
  failed: "text-destructive",
  cancelled: "text-muted-foreground",
};
