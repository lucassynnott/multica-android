/**
 * Inline issue-comment composer — thin wrapper around the shared
 * `<MessageComposer>` with comment-specific wiring:
 *
 *   - `onSubmit` → `useCreateComment(issueId).mutateAsync`
 *   - Reply target sourced from `useReplyTargetStore` (set by the
 *     comment long-press action sheet)
 *   - Mention picker path → `/[workspace]/mention-picker?mode=comment`
 *   - Upload context binds attachments to this issue
 *
 * All UI / state / chip plumbing lives in `MessageComposer`. The chat
 * composer (`components/chat/chat-composer.tsx`) uses the same component
 * with chat-mode props.
 */
import { useCallback } from "react";
import { useCreateComment } from "@/data/mutations/issues";
import { useReplyTargetStore } from "@/data/stores/reply-target-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { MessageComposer } from "@/components/composer/message-composer";
import { useT } from "@/lib/i18n";

export function InlineCommentComposer({
  issueId,
  surface,
}: {
  issueId: string;
  /** The surface the composer sits on; the detail pane is `bg-card`. */
  surface?: "background" | "card";
}) {
  const createComment = useCreateComment(issueId);
  const { t } = useT("issues");
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  // The store is a singleton and a second issue detail can be mounted (the
  // detail pane under a pushed issue screen): ignore another issue's target.
  const replyTarget = useReplyTargetStore((s) =>
    s.target?.issueId === issueId ? s.target : null,
  );
  const clearStoredReplyTarget = useReplyTargetStore((s) => s.clear);
  const clearReplyTarget = useCallback(() => {
    if (useReplyTargetStore.getState().target?.issueId === issueId) {
      clearStoredReplyTarget();
    }
  }, [issueId, clearStoredReplyTarget]);

  const onSubmit = useCallback(
    async ({
      content,
      attachmentIds,
    }: {
      content: string;
      attachmentIds: string[];
    }) => {
      try {
        await createComment.mutateAsync({
          content,
          parentId: replyTarget?.commentId,
          attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
        });
      } catch (err) {
        // Rethrow so MessageComposer's catch path restores text + chips.
        // The optimistic timeline row stays with its inline
        // Failed · Retry · Discard affordance.
        throw err;
      }
    },
    [createComment, replyTarget],
  );

  return (
    <MessageComposer
      onSubmit={onSubmit}
      mentionPickerPath={{
        pathname: "/[workspace]/mention-picker",
        params: { workspace: wsSlug ?? "", mode: "comment" },
      }}
      uploadContext={{ issueId }}
      surface={surface}
      placeholder={t("comments.composer_placeholder")}
      pillLabel={t("comments.composer_pill")}
      pillIcon="chatbubble-ellipses-outline"
      replyTarget={
        replyTarget
          ? {
              actorName: replyTarget.actorName,
              preview: replyTarget.preview,
            }
          : null
      }
      onClearReplyTarget={clearReplyTarget}
      expandTrigger={replyTarget?.commentId ?? null}
    />
  );
}
