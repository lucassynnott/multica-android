/**
 * Header for the issue detail screen.
 *
 * Nova anatomy, top to bottom:
 *   - identifier (MUL-NN) as a 12 pt muted label
 *   - title at 19/600, tracking-tight — the only large type on the screen
 *   - one badge line (status + priority + project) and the agent-runs row
 *   - the properties card (12 px muted keys, 13 px values)
 *
 * The native iOS Stack header still renders `issue.identifier` as the
 * navigation title; the body re-renders it per the reference screenshot.
 */
import { View } from "react-native";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { AttributeBadgeRow, AttributeRow } from "./attribute-row";
import { AgentActivityRow } from "./agent-activity-row";

export function IssueHeaderCard({ issue }: { issue: Issue }) {
  return (
    <View className="px-4 pb-4 pt-4">
      <Text className="text-xs text-muted-foreground">{issue.identifier}</Text>
      <Text className="mt-1 text-[19px] font-semibold leading-6 tracking-tight text-foreground">
        {issue.title}
      </Text>
      <View className="mt-3">
        <AttributeBadgeRow issue={issue} />
      </View>
      {/* Activity row sits between the badge line and the properties card —
       *  it represents "who's doing this issue right now / who has done it"
       *  (dynamic), which is higher-IA than the static properties below.
       *  Conditionally renders null when there are no tasks at all. */}
      <AgentActivityRow issueId={issue.id} />
      <View className="mt-3">
        <AttributeRow issue={issue} />
      </View>
    </View>
  );
}
