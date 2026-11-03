/**
 * Activity (non-comment) timeline row.
 *
 * Nova timeline anatomy: a 7 px dot on a 1 px rail, a 13/500 title
 * (`[actor] [verb]`) and a 12 pt muted sub-line carrying the relative time.
 * The rail extends 8 px below the row so consecutive activity rows read as one
 * continuous line; a comment card interrupts it, which is the visual cue that
 * the thread has a surface of its own.
 *
 * Behaviour is unchanged from the web-parity implementation
 * (`packages/views/issues/components/issue-detail.tsx:1046-1100`):
 *   - the verb comes from `formatActivity` and is truncated to two lines
 *   - the dot carries the workspace colour of the NEW status when a custom
 *     status changed; everything else draws a neutral ring
 *   - the time is relative and sits on the sub-line
 *   - coalesced repeats show `×N` next to the time, except `task_completed` /
 *     `task_failed`, whose phrase already bakes the count in.
 */
import { View } from "react-native";
import type { TimelineEntry } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { formatActivity } from "@/lib/format-activity";
import { timeAgo } from "@/lib/time-ago";
import { useActorLookup } from "@/data/use-actor-name";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import type { IssueStatusCatalog } from "@/lib/issue-status";

/** 7 px marker on the rail. Filled only when the row has a colour to carry. */
function LeadDot({
  entry,
  catalog,
}: {
  entry: TimelineEntry;
  catalog: IssueStatusCatalog;
}) {
  const details = (entry.details ?? {}) as Record<string, string>;
  const color =
    entry.action === "status_changed" && details.to
      ? catalog.colorOf(details.to)
      : null;

  if (color) {
    return (
      <View
        className="mt-[5px] h-[7px] w-[7px] rounded-full"
        style={{ backgroundColor: color }}
      />
    );
  }
  return (
    <View className="mt-[5px] h-[7px] w-[7px] rounded-full border border-muted-foreground/40 bg-background" />
  );
}

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
    <View className="px-4">
      <View className="flex-row gap-3">
        <View className="w-[7px] items-center">
          <View
            pointerEvents="none"
            className="absolute top-0 w-px bg-border"
            style={{ left: 3, bottom: -8 }}
          />
          <LeadDot entry={entry} catalog={catalog} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text
            className="text-[13px] font-medium text-foreground"
            numberOfLines={2}
          >
            {actorName}
            {verb ? (
              <Text className="text-[13px] font-normal text-muted-foreground">
                {" "}
                {verb}
              </Text>
            ) : null}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs text-muted-foreground">
              {timeAgo(entry.created_at)}
            </Text>
            {showCoalesceBadge ? (
              <Text className="text-xs tabular-nums text-muted-foreground">
                ×{entry.coalesced_count}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}
