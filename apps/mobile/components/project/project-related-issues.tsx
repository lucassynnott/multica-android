/**
 * Project issues, grouped by concrete status — the same sections the other
 * issue lists use.
 *
 * One card per status group: the group header names the status through
 * StatusBadge and its count through CountBadge, then the rows follow inside the
 * same surface. Rows keep their own `px-4`, so the card border is the only
 * vertical edge and nothing is indented twice.
 */
import { useMemo } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { IssueStatus } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/issue/status-badge";
import { IssueRow } from "@/components/issue/issue-row";
import { IssuesLoading } from "@/components/issue/issues-loading";
import { projectIssuesOptions } from "@/data/queries/projects";
import { useWorkspaceStore } from "@/data/workspace-store";
import { groupIssuesByStatus } from "@/lib/group-issues-by-status";
import { useIssueStatuses } from "@/lib/use-issue-statuses";
import { useT } from "@/lib/i18n";

interface Props {
  projectId: string;
}

export function ProjectRelatedIssues({ projectId }: Props) {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { t } = useT("issues");
  const { t: tProject } = useT("projects");
  const { data, isLoading, error, refetch } = useQuery(
    projectIssuesOptions(wsId, projectId),
  );

  const catalog = useIssueStatuses();
  const sections = useMemo(
    () => groupIssuesByStatus(data ?? [], catalog.statuses),
    [data, catalog.statuses],
  );

  const navigateToIssue = (id: string) => {
    if (wsSlug) router.push(`/${wsSlug}/issue/${id}`);
  };

  if (isLoading) return <IssuesLoading />;

  if (error) {
    return (
      <View className="gap-3 py-6">
        <Text className="text-[13px] text-destructive">
          {t("errors.load_failed", {
            message: error instanceof Error ? error.message : "unknown",
          })}
        </Text>
        <Button variant="outline" onPress={() => refetch()}>
          <Text>{t("common:actions.retry")}</Text>
        </Button>
      </View>
    );
  }

  if ((data?.length ?? 0) === 0) {
    return (
      <View className="gap-2">
        <Text className="px-1 text-[11px] font-medium text-muted-foreground">
          {tProject("detail.related_issues")}
        </Text>
        <Text className="text-[13px] text-muted-foreground">
          {t("list.empty")}
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Text className="px-1 text-[11px] font-medium text-muted-foreground">
        {tProject("detail.related_issues")}
      </Text>
      {sections.map(({ status, data: issues }) => {
        if (issues.length === 0) return null;
        return (
          <View
            key={status}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <SectionHeader status={status} count={issues.length} />
            {issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                onPress={() => navigateToIssue(issue.id)}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function SectionHeader({
  status,
  count,
}: {
  status: IssueStatus;
  count: number;
}) {
  const catalog = useIssueStatuses();
  return (
    <View className="h-10 flex-row items-center gap-2 border-b border-border px-4">
      <StatusBadge
        label={catalog.labelOf(status)}
        status={status}
        category={catalog.categoryOf(status)}
        color={catalog.colorOf(status)}
      />
      <View className="flex-1" />
      <CountBadge value={count} />
    </View>
  );
}
