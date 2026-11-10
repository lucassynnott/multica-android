/**
 * Issue detail: the read-mostly timeline with the inline comment composer
 * pinned to the bottom (`<InlineCommentComposer>`, which sticks to the
 * keyboard via `KeyboardStickyView`).
 *
 * Two hosts render it:
 *   - `variant="screen"`: the pushed route `issue/[id]`. The native Stack
 *     header shows the identifier (`MUL-123`, Linear-style) and the actions.
 *   - `variant="pane"`: the detail side of a list + detail split on a wide
 *     window (`components/issue/issue-detail-pane.tsx`). It draws its own
 *     compact header on the lighter `bg-card` surface, and has no route of
 *     its own: when the issue goes away it calls `onClose` instead of
 *     popping the stack.
 *
 * Everything else is shared: queries, the per-issue realtime subscription,
 * the "…" menu, pickers (routes under `issue/[id]/picker/*` that take the id
 * from their own URL, so pushing them from the pane works unchanged).
 */
import { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionSheet } from "@/lib/action-sheet";
import { Stack, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { TideTexture } from "@/components/ui/tide-texture";
import { TimelineList } from "@/components/issue/timeline-list";
import { AgentHeaderBadge } from "@/components/issue/agent-header-badge";
import { InlineCommentComposer } from "@/components/issue/inline-comment-composer";
import {
  issueDetailOptions,
  issueKeys,
  issueTimelineOptions,
} from "@/data/queries/issues";
import { useDeleteIssue } from "@/data/mutations/issues";
import { pinListOptions } from "@/data/queries/pins";
import { useCreatePin, useDeletePin } from "@/data/mutations/pins";
import { useAuthStore } from "@/data/auth-store";
import { useIssueRealtime } from "@/data/realtime/use-issue-realtime";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useViewedIssuesStore } from "@/data/viewed-issues-store";
import { useMarkInboxReadOnOpen } from "@/lib/use-mark-inbox-read-on-open";
import { useCommentSelectStore } from "@/data/comment-select-store";
import { useReplyTargetStore } from "@/data/stores/reply-target-store";
import { useT } from "@/lib/i18n";

interface Props {
  issueId: string;
  variant: "screen" | "pane";
  /** Inbox deep-link target: the comment id to scroll to and flash. */
  highlight?: string;
  /** Per-tap nonce so re-tapping the same inbox row re-fires the flash. */
  highlightNonce?: string;
  /** Pane only: the issue is gone (deleted here or by another client). */
  onClose?: () => void;
}

export function IssueDetailView({
  issueId: id,
  variant,
  highlight,
  highlightNonce,
  onClose,
}: Props) {
  const isPane = variant === "pane";
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const qc = useQueryClient();

  const detail = useQuery(issueDetailOptions(wsId, id));
  const timeline = useQuery(issueTimelineOptions(wsId, id));

  // The issue no longer exists. A screen pops back so the user isn't
  // stranded on a 404 detail page; a pane has no route to pop, it only
  // clears its selection.
  const leave = useCallback(() => {
    if (isPane) onClose?.();
    else router.back();
  }, [isPane, onClose]);

  // Subscribe to per-issue WS events: status/priority/assignee/label
  // changes, comments, activity, reactions, agent task progress.
  // Mounted with `id` — cleans up automatically on navigate-away.
  useIssueRealtime(id, leave);

  // Track viewed issues so the chat composer's `@` suggestion bar can
  // surface "Recent" — the user just looked at MUL-123, likely wants to
  // ask the agent about it next. Workspace-scoped + in-memory; see
  // data/viewed-issues-store.ts.
  useEffect(() => {
    if (wsId && id) {
      useViewedIssuesStore.getState().push(wsId, id);
    }
  }, [wsId, id]);

  useMarkInboxReadOnOpen(wsId, id);

  // Detail-scoped composer state — clear on unmount so re-entering the
  // issue starts from a clean slate (no stale text-selection comment id,
  // no stale "Replying to X" target). Both stores are singletons used by
  // the long-press action sheet; the reply target is only dropped when it
  // is this issue's, because a second detail can be mounted at once.
  useEffect(() => {
    return () => {
      useCommentSelectStore.getState().clear();
      if (useReplyTargetStore.getState().target?.issueId === id) {
        useReplyTargetStore.getState().clear();
      }
    };
  }, [id]);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      detail.refetch(),
      qc.invalidateQueries({ queryKey: issueKeys.timeline(wsId, id) }),
    ]);
  }, [detail, qc, wsId, id]);

  const issue = detail.data;
  const deleteIssue = useDeleteIssue();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { data: pins } = useQuery(pinListOptions(wsId, userId));
  const isPinned =
    !!issue &&
    !!pins?.some((p) => p.item_type === "issue" && p.item_id === issue.id);
  const createPin = useCreatePin();
  const deletePin = useDeletePin();
  const { t } = useT("issues");

  // Three-dot menu: Pin/Unpin / Copy link / Open on web (if web URL set) /
  // Delete. Mirrors apps/mobile/app/(app)/[workspace]/project/[id].tsx — same
  // ActionSheetIOS + Alert.alert confirm pattern. Property edits (status,
  // priority, assignee, due_date) live on the property list inside
  // the timeline list, not in this menu — one entry per action.
  const onPressMore = useCallback(() => {
    if (!issue || !wsSlug) return;
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL;
    const issueLink = webUrl
      ? `${webUrl}/${wsSlug}/issue/${issue.identifier}`
      : null;
    const actions = ["cancel", "pin"];
    if (isPinned) actions[1] = "unpin";
    actions.push("edit");
    if (issueLink) actions.push("copy_link");
    if (issueLink) actions.push("open_web");
    actions.push("delete");
    const options = actions.map((action) =>
      action === "cancel"
        ? t("common:actions.cancel")
        : action === "pin"
          ? t("menu.pin")
          : action === "unpin"
            ? t("menu.unpin")
            : action === "edit"
              ? t("menu.edit_details")
              : action === "copy_link"
                ? t("menu.copy_link")
                : action === "open_web"
                  ? t("menu.open_web")
                  : t("menu.delete_issue"),
    );
    const destructiveIndex = options.length - 1;
    ActionSheet.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 0,
        destructiveButtonIndex: destructiveIndex,
        title: issue.identifier,
      },
      (i) => {
        const action = actions[i];
        if (action === "pin") {
          createPin.mutate({ item_type: "issue", item_id: issue.id });
        } else if (action === "unpin") {
          deletePin.mutate({ itemType: "issue", itemId: issue.id });
        } else if (action === "edit") {
          if (wsSlug) router.push(`/${wsSlug}/issue/${issue.id}/edit`);
        } else if (action === "copy_link" && issueLink) {
          Clipboard.setStringAsync(issueLink);
        } else if (action === "open_web" && issueLink) {
          Linking.openURL(issueLink);
        } else if (action === "delete") {
          confirmDelete(issue, t, () =>
            deleteIssue.mutate(issue.id, { onSuccess: leave }),
          );
        }
      },
    );
  }, [issue, wsSlug, deleteIssue, isPinned, createPin, deletePin, t, leave]);

  const actions = issue ? (
    <>
      {/* Ambient agent-working badge — renders null when no active tasks,
       *  so it doesn't crowd the header in the common case. See
       *  agent-header-badge.tsx. */}
      <AgentHeaderBadge issueId={id} />
      {isPane ? (
        <IconButton
          name="expand-outline"
          iconSize={18}
          onPress={() => {
            if (wsSlug) router.push(`/${wsSlug}/issue/${id}`);
          }}
          accessibilityLabel={t("menu.open_full_screen")}
        />
      ) : null}
      <IconButton
        name="ellipsis-horizontal"
        onPress={onPressMore}
        accessibilityLabel={t("menu.issue_actions")}
      />
    </>
  ) : null;

  return (
    // The pane is one step lighter than the page (DESIGN.md "Colour") and
    // carries no texture of its own: the host screen already has one.
    <View className={isPane ? "flex-1 bg-card" : "flex-1 bg-background"}>
      {isPane ? (
        // Same 64dp row as the tab header beside it, so the two line up.
        <SafeAreaView edges={["top"]}>
          <View className="min-h-16 flex-row items-center gap-2 pl-5 pr-2">
            <Text
              className="flex-1 font-mono text-[13px] text-muted-foreground"
              numberOfLines={1}
            >
              {issue?.identifier ?? ""}
            </Text>
            {actions}
          </View>
        </SafeAreaView>
      ) : (
        <>
          <TideTexture height={300} />
          <Stack.Screen
            options={{
              title: issue?.identifier ?? t("navigation:routes.issue"),
              // The identifier is a code, not a title: mono and muted,
              // leading the bar beside the back arrow.
              headerTitleAlign: "left",
              headerTitle: issue
                ? () => (
                    <Text
                      className="font-mono text-[13px] text-muted-foreground"
                      numberOfLines={1}
                    >
                      {issue.identifier}
                    </Text>
                  )
                : undefined,
              headerBackTitle: t("common:actions.back"),
              headerRight: issue
                ? () => (
                    <View className="flex-row items-center gap-2">
                      {actions}
                    </View>
                  )
                : undefined,
            }}
          />
        </>
      )}
      {detail.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : !issue ? (
        <View className="flex-1 items-center justify-center gap-4 px-5">
          <Text className="text-center text-[15px] leading-[21px] text-destructive">
            {t("errors.load_failed", {
              message:
                detail.error instanceof Error
                  ? detail.error.message
                  : "not found",
            })}
          </Text>
          <View className="flex-row gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              onPress={() => detail.refetch()}
            >
              <Text>{t("common:actions.retry")}</Text>
            </Button>
            {/* A pane has no back arrow: without this an issue that can no
                longer be loaded would stay in the pane for good. */}
            {isPane ? (
              <Button variant="ghost" className="min-h-11" onPress={onClose}>
                <Text>{t("common:actions.close")}</Text>
              </Button>
            ) : null}
          </View>
        </View>
      ) : (
        <View className="flex-1">
          <TimelineList
            issue={issue}
            entries={timeline.data}
            timelineLoading={timeline.isLoading}
            refreshing={detail.isRefetching || timeline.isRefetching}
            onRefresh={onRefresh}
            highlightCommentId={highlight}
            highlightNonce={highlightNonce}
          />
          <InlineCommentComposer
            issueId={id}
            surface={isPane ? "card" : "background"}
          />
        </View>
      )}
    </View>
  );
}

function confirmDelete(
  issue: Issue,
  t: (key: string, options?: Record<string, unknown>) => string,
  onConfirm: () => void,
) {
  Alert.alert(
    t("delete.title"),
    t("delete.message", { identifier: issue.identifier }),
    [
      { text: t("common:actions.cancel"), style: "cancel" },
      { text: t("common:actions.delete"), style: "destructive", onPress: onConfirm },
    ],
  );
}
