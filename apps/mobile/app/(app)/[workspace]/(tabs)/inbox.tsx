import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  View,
} from "react-native";
import { ActionSheet } from "@/lib/action-sheet";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { InboxItem, InboxSection } from "@multica/core/types";
import { isInboxItemUnread } from "@multica/core/inbox/section";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/ui/header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { IconButton } from "@/components/ui/icon-button";
import { HeaderActions } from "@/components/ui/app-header-actions";
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
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { useT } from "@/lib/i18n";
import { useInboxUnreadCount } from "@/lib/unread-counts";
import {
  getInboxNavigationTarget,
  groupInboxItemsBySection,
} from "@/lib/inbox-display";

export default function Inbox() {
  const { t } = useT("inbox");
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { colorScheme } = useColorScheme();
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

  const onPressItem = useCallback((item: InboxItem) => {
    if (isInboxItemUnread(item)) {
      // Optimistic read flip lives in useMarkInboxRead.onMutate — fires
      // setQueryData synchronously before the cancelQueries await, so the
      // row is already styled "read" by the time iOS captures the source
      // snapshot for the native stack push transition.
      markRead.mutate(item.id);
    }
    const target = getInboxNavigationTarget(item, wsSlug, String(Date.now()));
    if (target) router.push(target);
  }, [markRead, wsSlug]);

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

  return (
    <View className="flex-1 bg-background">
      <Header
        title={t("title")}
        right={
          <>
            <IconButton
              name="ellipsis-horizontal"
              onPress={onPressMenu}
              accessibilityLabel={t("actions.inbox_actions")}
            />
            <HeaderActions />
          </>
        }
      />
      {/* Breathing room under the header, then the switch, then the list.
          The previous markup put the section switch flush against the header
          border with 4pt beneath it, so the screen read as one crammed block.
          Group gaps follow the 8pt grid: 16 above the group, 8 below it. */}
      <View className="px-4 pt-4 pb-2">
        <SegmentedControl
          options={[
            {
              value: "action",
              label: t("sections.action"),
              badge: unreadCount,
            },
            { value: "activity", label: t("sections.activity") },
          ]}
          value={section}
          onChange={(value) => setSection(value)}
          accessibilityLabel={t("title")}
        />
      </View>
      {isLoading ? (
        <InboxLoading />
      ) : error ? (
        <View className="px-4 gap-3 pt-4">
          <Text className="text-sm text-destructive">
            {t("errors.load_failed", {
              message: error instanceof Error ? error.message : "unknown",
            })}
          </Text>
          <Button variant="outline" onPress={() => refetch()}>
            <Text>{t("common:actions.retry")}</Text>
          </Button>
        </View>
      ) : !data || data.length === 0 ? (
        <InboxEmpty
          section={section}
          iconColor={THEME[colorScheme].mutedForeground}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-border ml-16" />
          )}
          contentContainerClassName="pb-6"
          renderItem={({ item }) => (
            <SwipeableInboxRow
              item={item}
              onPress={() => onPressItem(item)}
              onArchive={() => archive.mutate(item.id)}
            />
          )}
          refreshing={isRefetching}
          onRefresh={refetch}
        />
      )}
    </View>
  );
}

// Loading state — 6 row-shaped Skeletons matching InboxRow's layout
// (avatar circle + two text lines). Perceived perf wins over a centered
// spinner because the eye immediately sees the list-like structure.
function InboxLoading() {
  return (
    <View className="px-4 pt-4 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} className="flex-row gap-3">
          <Skeleton className="size-9 rounded-full" />
          <View className="flex-1 gap-2 pt-1">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </View>
        </View>
      ))}
    </View>
  );
}

function InboxEmpty({
  section,
  iconColor,
}: {
  section: InboxSection;
  iconColor: string;
}) {
  const { t } = useT("inbox");

  return (
    <View className="flex-1 items-center justify-center px-8 gap-2">
      <Ionicons name="mail-open-outline" size={32} color={iconColor} />
      <Text className="text-sm font-medium text-foreground text-center">
        {section === "activity"
          ? t("sections.activity_empty")
          : t("empty.title")}
      </Text>
      <Text className="text-xs text-muted-foreground text-center leading-[17px]">
        {section === "activity"
          ? t("sections.activity_empty_body")
          : t("empty.body")}
      </Text>
    </View>
  );
}
