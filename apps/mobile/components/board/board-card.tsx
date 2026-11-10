/**
 * Kanban card. A card is an object in its own right, so it is one of the few
 * bordered panels in the app (DESIGN.md, "Lists, not cards"):
 * `bg-card border border-border rounded-lg p-3`.
 *
 * Three lines, the same facts as a list row: mono identifier with the
 * trailing meta (urgent, else due date, else priority), the title, then the
 * assignee's avatar and name. Everything else (labels, description, activity)
 * lives on the issue screen.
 *
 * The status badge is opt-in: the column header already names the status, so
 * repeating it per card is noise, except where the column cannot name it
 * (see `BoardColumn`).
 */
import { memo } from "react";
import { Pressable, View } from "react-native";
import type { Issue, IssueStatusCategory } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { StatusBadge } from "@/components/issue/status-badge";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { useActorLookup } from "@/data/use-actor-name";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useIssueMeta } from "./issue-meta";

interface Props {
  issue: Issue;
  onPress: (issue: Issue) => void;
  onLongPress: (issue: Issue) => void;
  /** Dimmed while this card is the one being dragged. */
  dragging?: boolean;
  /**
   * Render the card's own StatusBadge. Off by default: the column header owns
   * the status. Callers turn it on only when the column cannot name the
   * status itself.
   */
  showStatus?: boolean;
  statusLabel?: string;
  statusCategory?: IssueStatusCategory;
  statusColor?: string | null;
}

export const BoardCard = memo(function BoardCard({
  issue,
  onPress,
  onLongPress,
  dragging,
  showStatus = false,
  statusLabel,
  statusCategory,
  statusColor,
}: Props) {
  const { t } = useT("issues");
  const meta = useIssueMeta(issue);
  const { getName } = useActorLookup();
  const assigned = Boolean(issue.assignee_type && issue.assignee_id);
  const assignee = assigned
    ? getName(issue.assignee_type, issue.assignee_id)
    : t("board.unassigned");

  return (
    <Pressable
      onPress={() => onPress(issue)}
      onLongPress={() => onLongPress(issue)}
      delayLongPress={260}
      accessibilityRole="button"
      accessibilityLabel={[issue.identifier, issue.title, meta?.text, assignee]
        .filter(Boolean)
        .join(", ")}
      className={cn(
        "gap-2 rounded-lg border border-border bg-card p-3 active:bg-secondary",
        dragging && "opacity-30",
      )}
    >
      <View className="flex-row items-center gap-2">
        <Text
          className="flex-1 font-mono text-xs text-muted-foreground"
          numberOfLines={1}
        >
          {issue.identifier}
        </Text>
        {meta ? (
          <Text
            className={cn(
              "text-xs",
              meta.urgent
                ? "font-semibold text-primary"
                : "text-muted-foreground",
            )}
          >
            {meta.text}
          </Text>
        ) : null}
      </View>

      <Text className="text-[15px] leading-[21px] text-foreground" numberOfLines={3}>
        {issue.title}
      </Text>

      <View className="flex-row items-center gap-2">
        {assigned ? (
          <ActorAvatar
            type={issue.assignee_type}
            id={issue.assignee_id}
            size={22}
          />
        ) : null}
        <Text
          className="flex-1 text-[13px] text-muted-foreground"
          numberOfLines={1}
        >
          {assignee}
        </Text>
        {showStatus ? (
          <StatusBadge
            label={statusLabel ?? issue.status}
            status={issue.status}
            category={statusCategory}
            color={statusColor}
          />
        ) : null}
      </View>
    </Pressable>
  );
});
