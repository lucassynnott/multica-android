/**
 * Activity (non-comment) timeline row.
 *
 * Graphite anatomy: mono relative time in a narrow column, the actor's
 * avatar, then one muted line (`[actor] [verb]`). A system event never
 * competes with a comment for attention, so nothing in the row is coloured.
 *
 * Behaviour is unchanged from the web-parity implementation
 * (`packages/views/issues/components/issue-detail.tsx:1046-1100`):
 *   - the verb comes from `formatActivity` and is truncated to two lines
 *   - coalesced repeats show `×N` after the verb, except `task_completed` /
 *     `task_failed`, whose phrase already bakes the count in.
 */
import { View } from "react-native";
import type { TimelineEntry } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { formatActivity } from "@/lib/format-activity";
import { useActorLookup } from "@/data/use-actor-name";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { compactTimeAgo } from "./compact-time";

/** Shared by every timeline row so times and avatars line up in columns. */
export const TIMELINE_TIME_CLASS =
  "w-12 font-mono text-xs leading-[22px] text-muted-foreground";
export const TIMELINE_AVATAR_SIZE = 22;

export function ActivityRow({ entry }: { entry: TimelineEntry }) {
  const { getName } = useActorLookup();
  const catalog = useIssueStatuses();
  const resolveName = (
    type: string | null | undefined,
    id: string | null | undefined,
  ): string =>
    getName(type as "member" | "agent" | null | undefined, id);
  const actorName =
    entry.actor_name || resolveName(entry.actor_type, entry.actor_id);
  const verb = formatActivity(entry, resolveName, catalog.labelOf);
  const showCoalesceBadge =
    (entry.coalesced_count ?? 1) > 1 &&
    entry.action !== "task_completed" &&
    entry.action !== "task_failed";

  return (
    <View className="flex-row items-start gap-2.5 px-5 py-1">
      <Text className={TIMELINE_TIME_CLASS} numberOfLines={1}>
        {compactTimeAgo(entry.created_at)}
      </Text>
      <ActorAvatar
        type={entry.actor_type as "member" | "agent" | "system"}
        id={entry.actor_id}
        name={entry.actor_name}
        avatarUrl={entry.actor_avatar_url}
        size={TIMELINE_AVATAR_SIZE}
      />
      <Text
        className="flex-1 text-[15px] leading-[22px] text-muted-foreground"
        numberOfLines={2}
      >
        {actorName}
        {verb ? ` ${verb}` : ""}
        {showCoalesceBadge ? (
          <Text className="font-mono text-xs text-muted-foreground">
            {"  "}×{entry.coalesced_count}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}
