/**
 * Chronological FlashList chat with initial bottom positioning and MVCP.
 * Follow new messages only while the user is near the bottom; preserve reading
 * position through asynchronous Markdown and image resizing.
 *
 * Render all normalized message roles and failure styling. Attachments not used
 * inline appear as standalone cards. Long-press actions highlight the target
 * without adding a border that would shift the layout.
 */
import { useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type {
  Agent,
  ChatMessage,
  ChatPendingTask,
  ChatQuickAction,
  TaskMessagePayload,
} from "@multica/core/types";
import type { AgentAvailability } from "@multica/core/agents";
import { taskMessagesOptions } from "@/data/queries/chat";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { Markdown } from "@/lib/markdown";
import { ImageSequenceProvider } from "@/lib/markdown/image-sequence";
import { failureReasonKey } from "@/lib/failure-reason-label";
import { formatElapsedMs } from "@/lib/format-elapsed";
import { cn } from "@/lib/utils";
import { useChatSelectStore } from "@/data/chat-select-store";
import { useChatMessageLongPress } from "./message-long-press";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatTimeline } from "./chat-timeline";
// Reuse the comment thread's standalone attachment list — same design web
// reuses in chat (AttachmentList). Renders any bound attachment not already
// referenced inline in the message content, with same-file dedup.
import { CommentAttachmentList } from "@/components/issue/comment-attachment-list";
import { StatusPill } from "./status-pill";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useT } from "@/lib/i18n";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  /** Has the workspace ever started a chat? Drives empty-state copy. */
  hasSessions: boolean;
  /** Currently picked / inherited agent. */
  agent: Agent | null;
  /** Receive a conversation-starter tap. Caller writes into the draft store
   *  (or focuses the composer with the text) — empty state stays neutral
   *  about send vs. preview. */
  onPickPrompt: (text: string) => void;
  /** Send a persisted assistant follow-up without first copying it into draft. */
  onQuickAction?: (action: ChatQuickAction) => void | Promise<unknown>;
  quickActionsDisabled?: boolean;
  /** Server-authoritative pending-task snapshot for the active session.
   *  Used to render the live timeline + status line as the last item in
   *  the message stream, mirroring web's
   *  `packages/views/chat/components/chat-message-list.tsx` placement. */
  pendingTask?: ChatPendingTask | null;
  /** Live timeline rows for the in-flight task. Already fetched by the
   *  parent so this list doesn't have to manage its own subscription. */
  liveTaskMessages?: TaskMessagePayload[];
  /** Resolved availability — drives the StatusPill's "Offline" /
   *  "Reconnecting" stages. Pass `undefined` while loading. */
  availability?: AgentAvailability;
}

export function ChatMessageList({
  messages,
  loading,
  hasSessions,
  agent,
  onPickPrompt,
  onQuickAction,
  quickActionsDisabled = false,
  pendingTask,
  liveTaskMessages,
  availability,
}: Props) {
  // Top-level selection subscription gates the outer "tap-outside-to-dismiss"
  // Pressable below. When null, the Pressable stays disabled and every tap
  // passes through to the list cells / bubble long-press wrappers normally.
  const selectingId = useChatSelectStore((s) => s.selectingId);

  // Every image in this session, in message order (MUL-5752), so tapping one
  // opens the lightbox at its position and a swipe walks the rest.
  //
  // Above the loading / empty early returns because hooks must run on every
  // render — an empty `messages` just yields an empty block list.
  //
  // Persisted messages only — same boundary web draws: a task transcript's
  // images live behind a separate cache and inside a folded section, so they
  // keep opening on their own rather than joining a sequence the reader
  // cannot see the rest of.
  const imageBlocks = useMemo(
    () =>
      messages.map((message) => ({
        content: message.content,
        attachments: message.attachments,
      })),
    [messages],
  );

  if (loading && messages.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (messages.length === 0) {
    // Empty new-chat state. Lives here (rather than the parent screen) so
    // the empty state and the rendered list share spacing/layout rules.
    return (
      <ChatEmptyState
        hasSessions={hasSessions}
        agent={agent}
        onPickPrompt={onPickPrompt}
      />
    );
  }

  // Show the live trace + status line until the persisted assistant
  // message lands. Once chat:done writes the assistant row, AssistantRow's
  // own timeline (read from the same cache entry) owns the render — no
  // double-rendering.
  const pendingTaskId = pendingTask?.task_id ?? null;
  const pendingAlreadyPersisted =
    !!pendingTaskId &&
    messages.some(
      (m) => m.role === "assistant" && m.task_id === pendingTaskId,
    );
  const showLiveSection = !!pendingTaskId && !pendingAlreadyPersisted;
  const showLiveTimeline =
    showLiveSection && (liveTaskMessages?.length ?? 0) > 0;

  return (
    // Outer Pressable owns the "tap anywhere outside the selected bubble
    // to exit text-selection mode" gesture. Disabled when no message is
    // selected, so it's a layout-only wrapper and every tap passes straight
    // through to the FlashList cells. Active state captures any tap that
    // didn't fire an inner Pressable — bubble cells in selecting mode
    // render their body without a Pressable wrapper (see `MessageRow`'s
    // `if (isSelecting) return body;`), so taps on the selected bubble
    // also dismiss, matching iOS Notes / iMessage behaviour. Scroll
    // gestures are unaffected (Pressable only intercepts non-drag taps).
    <ImageSequenceProvider blocks={imageBlocks}>
    <Pressable
      onPress={
        selectingId
          ? () => useChatSelectStore.getState().clear()
          : undefined
      }
      disabled={!selectingId}
      style={{ flex: 1 }}
    >
    {/* `key` on first message id forces remount on session switch so
        `startRenderingFromBottom` re-fires and we land at the new
        session's bottom (instead of inheriting the previous session's
        scroll position). Cheap because sessions are switched, not
        re-rendered every keystroke. */}
    <FlashList
      key={messages[0]?.id ?? "empty"}
      data={messages}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => (
        <MessageRow
          message={item}
          agent={agent}
          onQuickAction={onQuickAction}
          quickActionsDisabled={quickActionsDisabled}
        />
      )}
      // The byline above each reply reads the agent, which is not part of
      // `data`; without this a recycled cell keeps the previous agent's name.
      extraData={agent?.id}
      ItemSeparatorComponent={MessageSeparator}
      ListFooterComponent={
        showLiveSection ? (
          <View style={{ paddingTop: 18 }} className="gap-2.5">
            <AgentByline agent={agent} />
            {showLiveTimeline ? (
              <ChatTimeline items={liveTaskMessages ?? []} isStreaming />
            ) : null}
            <StatusPill
              pendingTask={pendingTask}
              taskMessages={liveTaskMessages}
              availability={availability}
            />
          </View>
        ) : null
      }
      // 20dp screen gutter, 18dp between turns. Vertical gap handled by
      // ItemSeparatorComponent (FlashList doesn't honour `gap-*` on
      // contentContainer the way FlatList's gap-via-NativeWind did).
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 18,
      }}
      // Chat behavior: initial render at the bottom; when new messages
      // arrive AND the user is within 20% of the bottom, auto-scroll.
      // Reading history (further than 20% up) is preserved. This single
      // prop replaces the entire FlatList-era guard ref dance.
      maintainVisibleContentPosition={{
        autoscrollToBottomThreshold: 0.2,
        startRenderingFromBottom: true,
      }}
      // Any user-initiated scroll exits message text-selection mode —
      // matches iMessage's behavior where scrolling implicitly commits /
      // dismisses the selection caret. Hooks both drag-start and the
      // momentum kick after a flick so a fast scroll can't escape.
      onScrollBeginDrag={() => useChatSelectStore.getState().clear()}
      onMomentumScrollBegin={() => useChatSelectStore.getState().clear()}
      // iMessage-style keyboard dismissal: dragging the list pulls the
      // keyboard down with the finger (iOS); tapping empty space between
      // bubbles dismisses it. `handled` keeps Pressables inside bubbles
      // (long-press action sheet etc.) firing normally.
      // "interactive" is iOS-only (Android treats it as "none"), which left
      // no way to put the keyboard away by scrolling.
      keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      keyboardShouldPersistTaps="handled"
    />
    </Pressable>
    </ImageSequenceProvider>
  );
}

function MessageSeparator() {
  return <View style={{ height: 18 }} />;
}

/**
 * Who is speaking: the agent's tile and name above each reply. Agent replies
 * are plain prose on the page, so this line (not a bubble) is what separates
 * them from the user's turns.
 */
function AgentByline({ agent }: { agent: Agent | null }) {
  if (!agent) return null;
  return (
    <View className="flex-row items-center gap-2">
      <ActorAvatar type="agent" id={agent.id} size={22} />
      <Text
        className="shrink text-[13px] font-semibold text-foreground"
        numberOfLines={1}
      >
        {agent.name}
      </Text>
    </View>
  );
}

function MessageRow({
  message,
  agent,
  onQuickAction,
  quickActionsDisabled,
}: {
  message: ChatMessage;
  agent: Agent | null;
  onQuickAction?: (action: ChatQuickAction) => void | Promise<unknown>;
  quickActionsDisabled: boolean;
}) {
  const isUser = message.role === "user";
  const { t } = useT("chat");
  const isFailure = !!message.failure_reason;
  const isSelecting = useChatSelectStore(
    (s) => s.selectingId === message.id,
  );
  const longPress = useChatMessageLongPress(message);

  if (isFailure) {
    return (
      <FailureBubble
        agent={agent}
        reasonLabel={t(failureReasonKey(message.failure_reason))}
        rawError={message.content}
        elapsedMs={message.elapsed_ms ?? null}
        isSelecting={isSelecting}
        longPress={longPress}
      />
    );
  }

  if (isUser) {
    // User bubble: same Markdown pipeline as assistant — `@mention`
    // serialisation `[MUL-1](mention://issue/<id>)`, inline links, and
    // inline code resolve identically to web's
    // `packages/views/chat/components/chat-message-list.tsx` user branch.
    // Width is capped at 82% so the bubble keeps its trailing alignment
    // instead of stretching across the column. The border is always 1dp and
    // only changes colour for select / long-press, so nothing shifts.
    const body = (
      <View
        className={cn(
          "self-end max-w-[82%] gap-1.5 rounded-lg border px-3.5 py-2.5",
          isSelecting
            ? "bg-card border-primary"
            : longPress.isPressed
              ? "bg-secondary border-border"
              : "bg-card border-border",
        )}
      >
        <Markdown
          content={message.content}
          attachments={message.attachments}
          selectable={isSelecting}
          compact
        />
        <CommentAttachmentList
          attachments={message.attachments}
          content={message.content}
        />
      </View>
    );
    if (isSelecting) return body;
    return (
      <Pressable
        onLongPress={longPress.onLongPress}
        delayLongPress={500}
      >
        {body}
      </Pressable>
    );
  }

  // Assistant: timeline fold + markdown + elapsed caption. See
  // AssistantRow for why timeline is lifted into its own component.
  return (
    <AssistantRow
      message={message}
      agent={agent}
      isSelecting={isSelecting}
      longPress={longPress}
      onQuickAction={onQuickAction}
      quickActionsDisabled={quickActionsDisabled}
    />
  );
}

/**
 * Persisted assistant message. Renders:
 *
 *   - Process-steps fold (from `task-messages` cache; same cache fed by
 *     the live timeline above, so completed runs keep their trace).
 *   - Markdown content (the model's final answer).
 *   - "Replied in Ns" caption when `elapsed_ms` is stamped.
 *
 * Web's equivalent is `AssistantMessage` in packages/views/chat/components/
 * chat-message-list.tsx — same shape, simplified for RN (no inner Tooltip
 * / Copy button — long-press already exposes Copy via the native action
 * sheet, and selection mode owns the highlight, so a hover-only Copy
 * affordance would be redundant on mobile).
 */
function AssistantRow({
  message,
  agent,
  isSelecting,
  longPress,
  onQuickAction,
  quickActionsDisabled,
}: {
  message: ChatMessage;
  agent: Agent | null;
  isSelecting: boolean;
  longPress: ReturnType<typeof useChatMessageLongPress>;
  onQuickAction?: (action: ChatQuickAction) => void | Promise<unknown>;
  quickActionsDisabled: boolean;
}) {
  // Read the cached timeline if any. `enabled` (in taskMessagesOptions) is
  // gated on isTaskMessageTaskId — optimistic id prefixes never fetch, so
  // freshly-sent messages don't spam the API while waiting for the real
  // task_id to land. Cached cells (after live timeline finished) return
  // synchronously with no network roundtrip.
  const { data: timeline = [] } = useQuery(
    taskMessagesOptions(message.task_id),
  );
  // no_response (MUL-4351, mirrors packages/views AssistantMessage): the agent
  // completed this turn without text. Keep the tool timeline and show a notice
  // instead of an empty Markdown block; caption reads "Finished in" not
  // "Replied in".
  const isNoResponse = message.message_kind === "no_response";
  const { t } = useT("chat");
  // Plain prose on the page: no bubble, the byline says who is speaking.
  const body = (
    <View className="gap-2.5">
      <AgentByline agent={agent} />
      {timeline.length > 0 ? (
        <ChatTimeline items={timeline} />
      ) : null}
      {isNoResponse ? (
        <Text className="text-[15px] leading-[23px] text-muted-foreground">
          {t("no_response")}
        </Text>
      ) : (
        <Markdown
          content={message.content}
          attachments={message.attachments}
          selectable={isSelecting}
        />
      )}
      {/* Standalone attachment cards for anything not referenced inline. An
          image-only reply is a real ('message') outcome with empty content, so
          it flows through the else-branch above (renders nothing) and the cards
          here ARE the reply. */}
      <CommentAttachmentList
        attachments={message.attachments}
        content={message.content}
      />
      {message.elapsed_ms != null ? (
        <ElapsedCaption
          variant={isNoResponse ? "finished" : "replied"}
          elapsedMs={message.elapsed_ms}
        />
      ) : null}
    </View>
  );
  const messageBody = isSelecting ? body : (
    <Pressable onLongPress={longPress.onLongPress} delayLongPress={500}>
      {body}
    </Pressable>
  );
  if (!onQuickAction || (message.quick_actions?.length ?? 0) === 0) {
    return messageBody;
  }
  return (
    <View className="gap-3.5">
      {messageBody}
      <QuickActions
        actions={message.quick_actions ?? []}
        disabled={quickActionsDisabled}
        onSelect={onQuickAction}
      />
    </View>
  );
}

function QuickActions({
  actions,
  disabled,
  onSelect,
}: {
  actions: ChatQuickAction[];
  disabled: boolean;
  onSelect: (action: ChatQuickAction) => void | Promise<unknown>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const { t } = useT("chat");
  const blocked = disabled || submitting;

  const handleSelect = async (action: ChatQuickAction) => {
    if (blocked) return;
    setSubmitting(true);
    try {
      await onSelect(action);
    } catch {
      // The send path rolls back its optimistic message. Keep the action usable
      // so a transient request failure can be retried.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      className="flex-row flex-wrap gap-2"
      accessibilityLabel={t("a11y.suggested_followups")}
    >
      {actions.slice(0, 3).map((action, index) => (
        <Pressable
          key={`${action.label}-${index}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: blocked }}
          disabled={blocked}
          onPress={() => void handleSelect(action)}
          className={cn(
            "h-11 max-w-full flex-row items-center gap-1.5 rounded-lg border border-border px-3.5 active:bg-secondary",
            blocked && "opacity-50",
          )}
        >
          <Text
            numberOfLines={1}
            className={cn(
              "shrink text-sm",
              action.primary
                ? "font-semibold text-primary"
                : "text-foreground",
            )}
          >
            {action.label}
          </Text>
          {action.primary ? (
            <Text className="text-sm font-semibold text-primary">↗</Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

// Persistent caption rendered under the assistant bubble / failure bubble
// once the server has written `elapsed_ms`. Server computes once at task
// completion, so this caption is identical across reloads and clients.
function ElapsedCaption({
  variant,
  elapsedMs,
}: {
  variant: "replied" | "failed" | "finished";
  elapsedMs: number;
}) {
  const { t } = useT("chat");
  const label =
    variant === "replied"
      ? t("elapsed.replied", { time: formatElapsedMs(elapsedMs) })
      : variant === "finished"
        ? t("elapsed.finished", { time: formatElapsedMs(elapsedMs) })
        : t("elapsed.failed", { time: formatElapsedMs(elapsedMs) });
  return (
    <Text className="font-mono text-xs text-muted-foreground">{label}</Text>
  );
}

function FailureBubble({
  agent,
  reasonLabel,
  rawError,
  elapsedMs,
  isSelecting,
  longPress,
}: {
  agent: Agent | null;
  reasonLabel: string;
  rawError: string;
  elapsedMs: number | null;
  isSelecting: boolean;
  longPress: ReturnType<typeof useChatMessageLongPress>;
}) {
  const hasRawError = rawError.trim().length > 0;
  const { t } = useT("chat");
  const { colorScheme } = useColorScheme();

  // B6: pass `selectable={isSelecting}` rather than hard-coding
  // `selectable` — otherwise UIKit's text-selection gesture pre-empts
  // our long-press handler and the action sheet never fires. Select-mode
  // cue is the border turning primary; the reason stays in destructive ink
  // so the failure signal is never lost.
  const body = (
    <View className="gap-2.5">
      <AgentByline agent={agent} />
      <View
        className={cn(
          "self-start max-w-full rounded-lg border px-3.5 py-2.5",
          isSelecting
            ? "border-primary"
            : longPress.isPressed
              ? "border-border bg-secondary"
              : "border-border",
        )}
      >
        <Text className="text-[13px] font-semibold text-destructive">
          {reasonLabel}
        </Text>
        {hasRawError ? (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <View
                accessibilityRole="button"
                accessibilityLabel={t("a11y.show_error_details")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 16 }}
                className="mt-1 min-h-7 flex-row items-center gap-1.5 self-start active:opacity-70"
              >
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color={THEME[colorScheme].mutedForeground}
                />
                <Text className="text-[13px] text-muted-foreground">
                  {t("details.show")}
                </Text>
              </View>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <View className="mt-1 border-l border-border pl-3">
                <Text
                  className="font-mono text-xs leading-5 text-muted-foreground"
                  selectable={isSelecting}
                >
                  {rawError}
                </Text>
              </View>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </View>
      {elapsedMs != null ? (
        <ElapsedCaption variant="failed" elapsedMs={elapsedMs} />
      ) : null}
    </View>
  );
  if (isSelecting) return body;
  return (
    <Pressable onLongPress={longPress.onLongPress} delayLongPress={500}>
      {body}
    </Pressable>
  );
}
