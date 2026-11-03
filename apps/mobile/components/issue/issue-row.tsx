/**
 * Shared issue row used by every list-style issue surface on mobile —
 * (tabs)/my-issues, more/issues (workspace-wide), pins, and project detail's
 * related-issues bucket.
 *
 * Anatomy (shadcn Nova list row): leading priority glyph, a two-line body
 * (title 14/500, one meta line with the identifier), and the assignee avatar
 * trailing. Everything sits on the 4pt grid: 12pt vertical padding, 12pt
 * between the leading glyph block and the body.
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
import { PriorityIcon } from "@/components/ui/priority-icon";
import { StatusIcon } from "@/components/ui/status-icon";
import { StatusBadge } from "@/components/issue/status-badge";
import { issueColumnCategory, isCustomStatus } from "@/lib/issue-status";
import { useIssueStatuses } from "@/lib/use-issue-statuses";

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
}

export function IssueRow({
  issue,
  onPress,
  showStatus = false,
  flush = false,
}: Props) {
  // One catalog read for the icon's colour, the badge colour and the custom
  // status name — see the divergence note in `custom-status-chip.tsx`.
  const catalog = useIssueStatuses();
  const category = issueColumnCategory(issue);
  const customStatus = isCustomStatus(catalog, issue.status);

  return (
    <Pressable
      onPress={onPress}
      className={`active:bg-secondary py-3 ${flush ? "" : "px-4"}`}
    >
      <View className="flex-row items-center gap-3">
        {/* The glyph is per CATEGORY, so a custom status draws its category's
            icon rather than falling back to Todo's; the colour is what tells
            two statuses of one category apart. (MUL-6243) */}
        <View className="flex-row items-center gap-2 shrink-0">
          {showStatus ? (
            <StatusIcon
              status={issue.status}
              category={category}
              icon={catalog.iconOf(issue.status)}
              color={catalog.colorOf(issue.status)}
              size={14}
            />
          ) : null}
          <PriorityIcon priority={issue.priority} size={14} />
        </View>
        <View className="flex-1 min-w-0">
          <Text
            className="text-sm font-medium text-foreground leading-[19px]"
            numberOfLines={1}
          >
            {issue.title}
          </Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <Text className="text-[11px] text-muted-foreground tabular-nums shrink-0">
              {issue.identifier}
            </Text>
            {customStatus ? (
              <StatusBadge
                label={catalog.labelOf(issue.status)}
                status={issue.status}
                category={category}
                color={catalog.colorOf(issue.status)}
              />
            ) : null}
          </View>
        </View>
        {issue.assignee_type && issue.assignee_id ? (
          <ActorAvatar
            type={issue.assignee_type}
            id={issue.assignee_id}
            size={20}
            showPresence
          />
        ) : null}
      </View>
    </Pressable>
  );
}
