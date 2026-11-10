/**
 * Header for the issue detail screen.
 *
 * Graphite anatomy, top to bottom:
 *   - title at 22/600, the only large type on the screen
 *   - the agent-runs row, when the issue has runs
 *   - the property list (see `AttributeRow`)
 *
 * The identifier is not repeated here: the native Stack header shows it.
 */
import { View } from "react-native";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { AttributeRow } from "./attribute-row";
import { AgentActivityRow } from "./agent-activity-row";

export function IssueHeaderCard({ issue }: { issue: Issue }) {
  return (
    <View>
      <Text className="px-5 pb-3 pt-1 text-[22px] font-semibold leading-[29px] text-foreground">
        {issue.title}
      </Text>
      {/* Runs sit between the title and the properties: "who is working on
       *  this right now" outranks the static fields below. Renders nothing
       *  when the issue has never had a run. */}
      <AgentActivityRow issueId={issue.id} />
      <AttributeRow issue={issue} />
    </View>
  );
}
