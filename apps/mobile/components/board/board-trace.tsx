/**
 * Activity trace for a board column or list group: how many of its issues
 * were last updated on each of the past 12 days, as six Braille glyphs.
 *
 * Real data only (`issue.updated_at` from the list already in the cache), and
 * purely decorative: the count beside the name is the information, so this is
 * hidden from accessibility and draws nothing when the column has been quiet.
 */
import { useMemo, useState } from "react";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { activityByDay, brailleTrace } from "@/lib/board";

export function BoardTrace({ issues }: { issues: Issue[] }) {
  // Fixed for the life of the header; a board left open past midnight is one
  // day stale until it remounts, which is fine for a decoration.
  const [now] = useState(() => new Date());
  const trace = useMemo(
    () => brailleTrace(activityByDay(issues, now)),
    [issues, now],
  );
  if (!trace) return null;
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      allowFontScaling={false}
      className="font-mono text-[13px] leading-[13px] text-muted-foreground opacity-50"
    >
      {trace}
    </Text>
  );
}
