/**
 * Kanban card. Compact by design: at the Fold 8's unfolded width a column is
 * ~296dp and two columns plus a gutter fit beside the navigation rail, so the
 * card shows identity, title, priority, assignee and due date — the same
 * field set web's `board-card.tsx` puts above the fold. Everything else
 * (labels, description, activity) lives on the issue screen.
 *
 * One surface: `rounded-xl border border-border bg-card p-4`. Identity and due
 * date collapse into a single 12 px muted line so the card has one text block
 * and one footer, not four stacked rows. The footer is Badges + the assignee,
 * and the status badge is opt-in: the column header already names the status,
 * so repeating it per card is noise — except where the column cannot name it
 * (see `BoardColumn`).
 */
import { Pressable, View } from "react-native";
import type { Issue, IssueStatusCategory } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/issue/status-badge";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { formatDateOnly } from "@multica/core/issues/date";
import { i18n, useT } from "@/lib/i18n";

interface Props {
  issue: Issue;
  /** Width is fixed per column so cards align across the board. */
  width: number;
  onPress: () => void;
  onLongPress: () => void;
  /** Hidden while this card is the one being dragged. */
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

export function BoardCard({
  issue,
  width,
  onPress,
  onLongPress,
  dragging,
  showStatus = false,
  statusLabel,
  statusCategory,
  statusColor,
}: Props) {
  const { t } = useT("issues");
  const due = issue.due_date
    ? formatDateOnly(
        issue.due_date,
        { month: "short", day: "numeric" },
        i18n.resolvedLanguage ?? i18n.language,
      )
    : null;

  const meta = due ? `${issue.identifier} · ${due}` : issue.identifier;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={260}
      style={{ width }}
      className={`rounded-xl border border-border bg-card p-4 active:bg-secondary ${
        dragging ? "opacity-30" : ""
      }`}
    >
      <Text
        className="text-[14px] font-medium leading-[19px] text-foreground"
        numberOfLines={3}
      >
        {issue.title}
      </Text>

      <Text
        className="mt-1 text-[12px] text-muted-foreground tabular-nums"
        numberOfLines={1}
      >
        {meta}
      </Text>

      <View className="mt-3 flex-row items-center gap-1.5">
        {issue.priority !== "none" ? (
          <Badge variant="outline" className="gap-1">
            <PriorityIcon priority={issue.priority} size={11} />
            <Badge.Text>{t(`priority.${issue.priority}`)}</Badge.Text>
          </Badge>
        ) : null}
        {showStatus ? (
          <StatusBadge
            label={statusLabel ?? issue.status}
            status={issue.status}
            category={statusCategory}
            color={statusColor}
          />
        ) : null}
        <View className="flex-1" />
        {issue.assignee_type && issue.assignee_id ? (
          <ActorAvatar
            type={issue.assignee_type}
            id={issue.assignee_id}
            size={20}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
