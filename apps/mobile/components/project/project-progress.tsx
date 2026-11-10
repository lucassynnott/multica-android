/**
 * The project completion bar: a 2dp hairline track with a foreground fill, no
 * label. Not the accent — vermilion is for actions, unread and urgent.
 *
 * Shared by the project list card and the project header card so the same
 * `done_count / issue_count` reads identically in both places — and so the
 * divide-by-zero guard lives in exactly one spot. Callers render this only
 * when `issue_count > 0`; the guard here is defensive.
 */
import { View } from "react-native";

interface Props {
  done: number;
  total: number;
}

export function ProjectProgress({ done, total }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <View className="h-0.5 w-full overflow-hidden rounded-full bg-border">
      <View
        className="h-full rounded-full bg-foreground"
        style={{ width: `${pct}%` }}
      />
    </View>
  );
}
