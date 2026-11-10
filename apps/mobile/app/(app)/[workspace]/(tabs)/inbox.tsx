import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, View } from "react-native";
import { ActionSheet } from "@/lib/action-sheet";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { InboxItem, InboxSection } from "@multica/core/types";
import { isInboxItemUnread } from "@multica/core/inbox/section";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/ui/header";
import { TideTexture } from "@/components/ui/tide-texture";
import { IconButton } from "@/components/ui/icon-button";
import { HeaderActions } from "@/components/ui/app-header-actions";
import { SplitPane } from "@/components/ui/split-pane";
import { IssueDetailPane } from "@/components/issue/issue-detail-pane";
import { SwipeableInboxRow } from "@/components/inbox/swipeable-inbox-row";
import { inboxListOptions } from "@/data/queries/inbox";
import {
  useArchiveAllInbox,
  useArchiveAllReadInbox,
  useArchiveCompletedInbox,
  useArchiveInbox,
  useMarkAllInboxRead,
  useMarkInboxRead,
} from "@/data/mutations/inbox";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";
import { useIssuePane } from "@/lib/use-issue-pane";
import { useInboxUnreadCount } from "@/lib/unread-counts";
import { cn } from "@/lib/utils";
import {
  getInboxNavigationTarget,
  groupInboxItemsBySection,
} from "@/lib/inbox-display";

export default function Inbox() {
  const { t } = useT("inbox");
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { data: rawItems, isLoading, error, refetch, isRefetching } = useQuery(
    inboxListOptions(wsId),
  );
  // Dedup + drop archived to match web/desktop, split into the same two
  // sections. See CLAUDE.md "Behavioral parity" → inbox dedup incident.
  const [section, setSection] = useState<InboxSection>("action");
  const sections = useMemo(
    () => groupInboxItemsBySection(rawItems ?? []),
    [rawItems],
  );
  const data = sections[section];
  const unreadCount = useInboxUnreadCount(wsId);
  const markRead = useMarkInboxRead();
  const markAllRead = useMarkAllInboxRead();
  const archive = useArchiveInbox();
  const archiveAll = useArchiveAllInbox();
  const archiveAllRead = useArchiveAllReadInbox();
  const archiveCompleted = useArchiveCompletedInbox();

  // Wide windows: a row that targets an issue opens it in the detail pane
  // beside the list instead of pushing the issue screen. Rows with another
  // target (the autopilot sheets) still push.
  const pane = useIssuePane("inbox");
  const selectIssue = pane.select;

  const onPressItem = useCallback((item: InboxItem) => {
    if (isInboxItemUnread(item)) {
      // Optimistic read flip lives in useMarkInboxRead.onMutate — fires
      // setQueryData synchronously before the cancelQueries await, so the
      // row is already styled "read" by the time iOS captures the source
      // snapshot for the native stack push transition.
      markRead.mutate(item.id);
    }
    const historyToken = String(Date.now());
    if (
      item.issue_id &&
      selectIssue({
        issueId: item.issue_id,
        highlight: item.details?.comment_id,
        nonce: historyToken,
      })
    ) {
      return;
    }
    const target = getInboxNavigationTarget(item, wsSlug, historyToken);
    if (target) router.push(target);
  }, [markRead, wsSlug, selectIssue]);

  // Trailing batch menu — mirrors web's dropdown
  // (packages/views/inbox/components/inbox-page.tsx). "Mark all read" is
  // first (most common batch op); "Archive all" is destructive so it gets
  // the iOS red treatment + Alert confirm.
  const onPressMenu = () => {
    const options = [
      t("common:actions.cancel"),
      t("actions.mark_all_read"),
      t("actions.archive_all_read"),
      t("actions.archive_completed"),
      t("actions.archive_all"),
    ];
    ActionSheet.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 0,
        destructiveButtonIndex: 4,
        title: t("title"),
      },
      (i) => {
        if (i === 1) markAllRead.mutate();
        else if (i === 2) archiveAllRead.mutate();
        else if (i === 3) archiveCompleted.mutate();
        else if (i === 4) {
          Alert.alert(
            t("archive.confirm_title"),
            t("archive.confirm_body"),
            [
              { text: t("common:actions.cancel"), style: "cancel" },
              {
                text: t("actions.archive_all"),
                style: "destructive",
                onPress: () => archiveAll.mutate(),
              },
            ],
          );
        }
      },
    );
  };

  const loadFailed = !!error && !rawItems;

  return (
    <View className="flex-1 bg-background">
      <TideTexture height={420} />
      <SplitPane
        split={pane.split}
        detail={<IssueDetailPane surface="inbox" />}
        list={
          <>
            {/* The count is the server's unread summary, never a tally of the rows
                below — the two sections dedupe differently from the badge. */}
            <Header
              title={t("title")}
              count={
                unreadCount > 0 ? t("unread_count", { count: unreadCount }) : undefined
              }
              right={
                <>
                  <HeaderActions />
                  <IconButton
                    name="ellipsis-horizontal"
                    onPress={onPressMenu}
                    accessibilityLabel={t("actions.inbox_actions")}
                  />
                </>
              }
            />
            <SectionTabs
              value={section}
              onChange={setSection}
              accessibilityLabel={t("title")}
              options={[
                { value: "action", label: t("sections.action") },
                { value: "activity", label: t("sections.activity") },
              ]}
            />
            {isLoading ? (
              <InboxLoading />
            ) : (
              // One list for rows, the empty state and the load error, so every
              // state can be pulled to refresh.
              <FlatList
                data={loadFailed ? [] : data}
                keyExtractor={(item) => item.id}
                extraData={pane.selectedId}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
                renderItem={({ item }) => (
                  <SwipeableInboxRow
                    item={item}
                    selected={!!item.issue_id && item.issue_id === pane.selectedId}
                    onPress={() => onPressItem(item)}
                    onArchive={() => archive.mutate(item.id)}
                  />
                )}
                ListEmptyComponent={
                  loadFailed ? (
                    <View className="gap-3 px-5 pt-6">
                      <Text className="text-[15px] leading-[21px] text-foreground">
                        {t("errors.load_failed", {
                          message: error instanceof Error ? error.message : "unknown",
                        })}
                      </Text>
                      <Button
                        variant="outline"
                        className="min-h-11 self-start"
                        onPress={() => refetch()}
                      >
                        <Text>{t("common:actions.retry")}</Text>
                      </Button>
                    </View>
                  ) : (
                    <InboxEmpty section={section} />
                  )
                }
                ListFooterComponent={
                  !loadFailed && data.length > 0 ? (
                    <Text className="px-5 pt-[18px] text-[13px] text-muted-foreground">
                      {t("swipe_hint")}
                    </Text>
                  ) : null
                }
                refreshing={isRefetching}
                onRefresh={refetch}
              />
            )}
          </>
        }
      />
    </View>
  );
}

/**
 * Text tabs for the two sections (DESIGN.md "Tabs inside a screen"): the
 * selected one is 600 with a 2dp foreground underline sitting on the hairline.
 */
function SectionTabs({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: InboxSection; label: string }[];
  value: InboxSection;
  onChange: (value: InboxSection) => void;
  accessibilityLabel: string;
}) {
  return (
    <View
      className="flex-row gap-6 border-b border-border px-5"
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            hitSlop={{ left: 12, right: 12 }}
            className={cn(
              "h-11 min-w-11 justify-center border-b-2",
              selected ? "border-foreground" : "border-transparent",
            )}
          >
            <Text
              className={cn(
                "text-[15px]",
                selected
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Loading state — row-shaped skeletons matching InboxRow (avatar + two text
// lines), so the eye lands on list structure instead of a centered spinner.
function InboxLoading() {
  return (
    <View>
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={i}
          className="min-h-16 flex-row gap-3 border-b border-border px-5 py-3.5"
        >
          <Skeleton className="size-8 rounded-full" />
          <View className="flex-1 gap-2 pt-1">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </View>
        </View>
      ))}
    </View>
  );
}

function InboxEmpty({ section }: { section: InboxSection }) {
  const { t } = useT("inbox");

  return (
    <View className="gap-1 px-5 pt-6">
      <Text className="text-[15px] font-semibold leading-[21px] text-foreground">
        {section === "activity" ? t("sections.activity_empty") : t("empty.title")}
      </Text>
      <Text className="text-[13px] leading-[19px] text-muted-foreground">
        {section === "activity"
          ? t("sections.activity_empty_body")
          : t("empty.body")}
      </Text>
    </View>
  );
}
