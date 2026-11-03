/**
 * Description block. Renders markdown via the standalone mobile markdown
 * renderer at apps/mobile/lib/markdown/. Empty / null descriptions show a
 * muted placeholder rather than collapsing the block, so the layout above the
 * timeline stays stable when the user adds a description later.
 *
 * Nova anatomy: an 11 pt muted sentence-case "Description" label, 8 pt above
 * the body. Body type comes from the markdown renderer's own scale, which the
 * markdown ADR owns — this file only sets the label and the block inset.
 *
 * Attachments are fetched per-issue so markdown can resolve `mc://file/<id>`
 * image URIs into real `download_url` HTTPS endpoints — without this the
 * iOS image loader doesn't understand the mc: scheme and the image fails.
 * TanStack Query dedupes the request across this component and CommentCard
 * (both call `issueAttachmentsOptions(wsId, issueId)`), so only one
 * network roundtrip fires per issue.
 */
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { Markdown } from "@/lib/markdown";
import { issueAttachmentsOptions } from "@/data/queries/issues";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";

export function IssueDescription({
  issueId,
  description,
}: {
  issueId: string;
  description: string | null;
}) {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { t } = useT("issues");
  const { data: attachments } = useQuery(
    issueAttachmentsOptions(wsId, issueId),
  );

  const empty = !description || description.trim().length === 0;

  return (
    <View className="px-4 pt-4 pb-2">
      <Text className="text-[11px] font-medium text-muted-foreground">
        {t("detail.description")}
      </Text>
      <View className="mt-2">
        {empty ? (
          <Text className="text-[13px] text-muted-foreground/70">
            No description.
          </Text>
        ) : (
          <Markdown content={description} attachments={attachments} />
        )}
      </View>
    </View>
  );
}
