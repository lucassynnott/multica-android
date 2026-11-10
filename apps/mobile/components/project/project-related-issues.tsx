/**
 * Project issues, grouped by concrete status — the same sections the other
 * issue lists use.
 *
 * A "Related issues" group header with the total, then one DESIGN.md group
 * header per status (44dp, top hairline, name 13/600, mono count) followed by
 * its rows. No panels: rows sit on the page gutter like every other list.
 */
import { useMemo } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import type { IssueStatus } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { StatusIcon } from "@/components/ui/status-icon";
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

  const title = (
    <View className="h-11 flex-row items-center gap-2.5 border-t border-border px-5">
      <Text className="text-[13px] font-semibold text-foreground">
        {tProject("detail.related_issues")}
      </Text>
      {data && data.length > 0 ? (
        <Text className="font-mono text-xs text-muted-foreground">
          {data.length}
        </Text>
      ) : null}
    </View>
  );

  if (isLoading) return <IssuesLoading />;
  // The error replaces the list only when there is nothing to show.
  if (error && !data) {
    return (
      <View>
        {title}
        <View className="gap-3 px-5 pb-3">
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
      </View>
    );
  }
  if ((data?.length ?? 0) === 0) {
    return (
      <View>
        {title}
        <Text className="px-5 pb-3 text-[13px] text-muted-foreground">
          {t("list.empty")}
        </Text>
      </View>
    );
  }

  return (
    <View>
      {title}
      {sections.map(({ status, data: issues }) => {
        if (issues.length === 0) return null;
        return (
          <View key={status}>
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
    <View className="h-11 flex-row items-center gap-2.5 border-t border-border px-5">
      <StatusIcon
        status={status}
        category={catalog.categoryOf(status)}
        icon={catalog.iconOf(status)}
        color={catalog.colorOf(status)}
        size={14}
      />
      <Text className="text-[13px] font-semibold text-foreground">
        {catalog.labelOf(status)}
      </Text>
      <Text className="font-mono text-xs text-muted-foreground">{count}</Text>
    </View>
  );
}
