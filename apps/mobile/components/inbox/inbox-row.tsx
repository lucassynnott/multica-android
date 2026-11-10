/**
 * Inbox row content — the visual half, no gesture wrapping. Pulled out of
 * (tabs)/inbox.tsx so swipeable-inbox-row.tsx can wrap it with the gesture
 * recognizer without duplicating layout. Keep this file purely presentational
 * — the swipe and the press behaviour live in the wrapper.
 *
 * Layout (DESIGN.md, AppInbox mockup): the actor's avatar with the unread dot
 * on its top-left corner, the title at 15 (600 while unread), one 13 muted
 * line saying what happened (the type-aware `InboxDetailLabel`, never the raw
 * body), and a trailing mono column with the issue reference above the time.
 *
 * The list payload carries an issue identifier only for quick-create items
 * (`details.identifier`); other rows resolve it from the issue caches
 * (`useIssueIdentifier`) and, when that misses, show the linked issue's status
 * glyph in that slot, which is also what tells two rows for the same issue
 * apart after a status move (MUL-6395).
 */
import { Pressable, View } from "react-native";
import type { InboxItem } from "@multica/core/types";
import { isInboxItemUnread } from "@multica/core/inbox/section";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { StatusIcon } from "@/components/ui/status-icon";
import { InboxDetailLabel } from "@/components/inbox/detail-label";
import { getInboxDisplayTitle } from "@/lib/inbox-display";
import { useIssueIdentifier } from "@/lib/use-issue-identifier";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { timeAgo } from "@/lib/time-ago";
import { cn } from "@/lib/utils";

interface Props {
  item: InboxItem;
  onPress: () => void;
  /** The row's issue is open in the detail pane beside the list. */
  selected?: boolean;
}

export function InboxRow({ item, onPress, selected = false }: Props) {
  const isUnread = isInboxItemUnread(item);
  const { categoryOf, colorOf, iconOf } = useIssueStatuses();
  const displayTitle = getInboxDisplayTitle(item);
  const actorType = item.actor_type ?? item.recipient_type;
  const actorId = item.actor_id ?? item.recipient_id;

  // The payload names the issue only for quick-create items; otherwise resolve
  // it from the issue caches, keeping the status glyph when that misses.
  const cachedIdentifier = useIssueIdentifier(
    item.details?.identifier ? null : item.issue_id,
  );
  const identifier = item.details?.identifier || cachedIdentifier;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        "min-h-16 flex-row gap-3 border-b border-border px-5 py-3.5 active:bg-secondary",
        selected ? "bg-secondary" : "bg-background",
      )}
    >
      <View className="mt-px shrink-0">
        <ActorAvatar type={actorType} id={actorId} size={32} showPresence />
        {isUnread ? (
          <View
            pointerEvents="none"
            className="absolute -left-[3px] -top-[3px] size-[11px] rounded-full border-2 border-background bg-primary"
          />
        ) : null}
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text
          className={cn(
            "text-[15px] leading-[21px] text-foreground",
            isUnread && "font-semibold",
          )}
          numberOfLines={2}
        >
          {displayTitle}
        </Text>
        <InboxDetailLabel item={item} />
      </View>
      <View className="shrink-0 items-end gap-1">
        {identifier ? (
          <Text className="font-mono text-xs leading-[21px] text-muted-foreground">
            {identifier}
          </Text>
        ) : item.issue_status ? (
          // Colour carries a custom status's identity; `colorOf` is null for
          // a built-in, which keeps it on its category token.
          <View className="h-[21px] justify-center">
            <StatusIcon
              status={item.issue_status}
              category={categoryOf(item.issue_status)}
              icon={iconOf(item.issue_status)}
              color={colorOf(item.issue_status)}
              size={14}
            />
          </View>
        ) : null}
        <Text className="font-mono text-xs text-muted-foreground">
          {timeAgo(item.created_at)}
        </Text>
      </View>
    </Pressable>
  );
}
