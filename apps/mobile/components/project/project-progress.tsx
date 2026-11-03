/**
 * The project completion bar: one 6 dp track, one brand fill, no label.
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
    <View className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <View
        className="h-full rounded-full bg-brand"
        style={{ width: `${pct}%` }}
      />
    </View>
  );
}
