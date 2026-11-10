/**
 * Shared issue row used by every list-style issue surface on mobile —
 * (tabs)/my-issues, more/issues (workspace-wide), pins, and project detail's
 * related-issues bucket.
 *
 * Anatomy (DESIGN.md "Row"): the mono identifier in a fixed 62dp column, the
 * title at 15/21, one trailing meta at 12 (the due date, else the priority —
 * vermilion and 600 only when the issue is urgent), then the assignee avatar.
 * Priority is text here, not a coloured glyph: vermilion is the only accent.
 *
 * `showStatus` is opt-in because the grouped lists already carry the status
 * CATEGORY in their section header (rendering the glyph again per-row would be
 * visual noise). Ungrouped surfaces that mix statuses — the pins list — ask for
 * it. New callers should default to false unless they mix multiple statuses
 * inside a single ungrouped list.
 *
 * A custom status still earns a `<StatusBadge>` under the title: a section
 * header names a category, so "Code Review" and "QA" both land under In Review
 * and the row is the only place left to tell them apart. Built-in statuses stay
 * silent, so a workspace without custom statuses reads exactly as before.
 * (MUL-6243)
 *
 * Behavioral parity:
 *   - Same `Issue` type, same `assignee_type`/`assignee_id` semantics
 *     (root CLAUDE.md "Data identity must agree").
 *   - Mirrors web `packages/views/issues/components/list-row.tsx:52`:
 *     render the assignee whenever `assignee_type && assignee_id` are both
 *     truthy — `ActorAvatar` itself handles member / agent / squad rendering
 *     (rounded square + people glyph or `squad.avatar_url` for squads). A
 *     future fourth enum value falls through to ActorAvatar's initials
 *     fallback, which is the real "enum drift downgrades, not crashes"
 *     behavior — earlier whitelist (member/agent only) silently dropped
 *     squad assignees instead.
 */
import { Pressable, View } from "react-native";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { StatusIcon } from "@/components/ui/status-icon";
import { StatusBadge } from "@/components/issue/status-badge";
import { formatDateOnly } from "@multica/core/issues/date";
import {
  issueColumnCategory,
  isCustomStatus,
  PRIORITY_LABEL,
} from "@/lib/issue-status";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { i18n, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  issue: Issue;
  onPress: () => void;
  /** Render the status icon inline at the start of the row. Default: false. */
  showStatus?: boolean;
  /**
   * Drop the row's own horizontal padding. For screens that already apply the
   * page inset themselves (the project detail overview), so rows line up with
   * the sections above them instead of being indented twice.
   */
  flush?: boolean;
  /** The issue is open in the detail pane beside the list. */
  selected?: boolean;
  /**
   * Two-line layout for the ~300dp list column of a list + detail split:
   * id, meta and avatar on one line, the title on the next.
   */
  stacked?: boolean;
}

export function IssueRow({
  issue,
  onPress,
  showStatus = false,
  flush = false,
  selected = false,
  stacked = false,
}: Props) {
  // One catalog read for the icon's colour, the badge colour and the custom
  // status name — see the divergence note in `custom-status-chip.tsx`.
  const catalog = useIssueStatuses();
  const { t } = useT("issues");
  const category = issueColumnCategory(issue);
  const customStatus = isCustomStatus(catalog, issue.status);
  const urgent = issue.priority === "urgent";
  // One meta slot: urgency outranks the date, the date outranks a routine
  // priority, and "no priority" says nothing.
  const meta: string | null = urgent
    ? t(PRIORITY_LABEL.urgent)
    : issue.due_date
      ? formatDateOnly(
          issue.due_date,
          { month: "short", day: "numeric" },
          i18n.resolvedLanguage ?? i18n.language,
        )
      : issue.priority !== "none"
        ? t(PRIORITY_LABEL[issue.priority])
        : null;

  const identifier = (
    <Text
      className={cn(
        "font-mono text-xs leading-[21px] text-muted-foreground",
        stacked ? "min-w-0 flex-1" : "w-[62px] shrink-0",
      )}
      numberOfLines={1}
    >
      {issue.identifier}
    </Text>
  );
  // The glyph is per CATEGORY, so a custom status draws its category's icon
  // rather than falling back to Todo's; the colour is what tells two statuses
  // of one category apart. (MUL-6243)
  const statusIcon = showStatus ? (
    <View className="h-[21px] justify-center">
      <StatusIcon
        status={issue.status}
        category={category}
        icon={catalog.iconOf(issue.status)}
        color={catalog.colorOf(issue.status)}
        size={14}
      />
    </View>
  ) : null;
  const title = (
    <View className={cn("gap-1", !stacked && "min-w-0 flex-1")}>
      <Text
        className="text-[15px] leading-[21px] text-foreground"
        numberOfLines={2}
      >
        {issue.title}
      </Text>
      {customStatus ? (
        <View className="flex-row">
          <StatusBadge
            label={catalog.labelOf(issue.status)}
            status={issue.status}
            category={category}
            color={catalog.colorOf(issue.status)}
          />
        </View>
      ) : null}
    </View>
  );
  const metaText = meta ? (
    <Text
      className={cn(
        "shrink-0 text-xs leading-[21px]",
        urgent ? "font-semibold text-primary" : "text-muted-foreground",
      )}
      numberOfLines={1}
    >
      {meta}
    </Text>
  ) : null;
  const avatar =
    issue.assignee_type && issue.assignee_id ? (
      <ActorAvatar
        type={issue.assignee_type}
        id={issue.assignee_id}
        size={stacked ? 20 : 22}
        showPresence
      />
    ) : null;

  if (stacked) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        className={cn(
          "min-h-11 gap-1 py-2.5 active:bg-secondary",
          !flush && "px-5",
          selected && "bg-secondary",
        )}
      >
        <View className="flex-row items-center gap-2">
          {statusIcon}
          {identifier}
          {metaText}
          {avatar}
        </View>
        {title}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        "min-h-11 flex-row items-start gap-2 py-2.5 active:bg-secondary",
        !flush && "px-5",
        selected && "bg-secondary",
      )}
    >
      {identifier}
      {statusIcon}
      {title}
      {metaText}
      {avatar}
    </Pressable>
  );
}
