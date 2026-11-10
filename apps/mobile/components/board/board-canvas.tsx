/**
 * The kanban canvas: columns side by side, each scrolling on its own.
 *
 * Shared by the workspace board tab and the board inside a project so the
 * geometry and the column behaviour are identical in both places. The caller
 * owns the data, the filters and the header; this owns only how the columns
 * are laid out on screen.
 *
 * Columns butt against each other and are divided by hairlines, so the
 * metrics' `gap` is not drawn between them. The snap interval is exactly one
 * column.
 */
import { ScrollView } from "react-native";
import type { Issue } from "@multica/core/types";
import { BoardColumn } from "./board-column";
import type { BoardColumnModel } from "@/lib/board";
import type { IssueStatusCatalog } from "@/lib/issue-status";
import { boardMetrics, useResponsiveLayout } from "@/lib/responsive";

interface Props {
  columns: BoardColumnModel[];
  catalog: IssueStatusCatalog;
  onPressIssue: (issue: Issue) => void;
  onLongPressIssue: (issue: Issue) => void;
  onAddIssue: (status: string) => void;
}

export function BoardCanvas({
  columns,
  catalog,
  onPressIssue,
  onLongPressIssue,
  onAddIssue,
}: Props) {
  const layout = useResponsiveLayout();
  const { columnWidth } = boardMetrics(layout);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Settle on a column edge. Free scrolling on the cover screen, where
      // one column fills the view, kept stopping with two half-columns.
      snapToInterval={columnWidth}
      snapToAlignment="start"
      decelerationRate="fast"
      style={{ flex: 1 }}
      // No contentContainerStyle: stretch (the default) gives each column the
      // viewport's height, so its card list scrolls independently instead of
      // growing past the bottom of the screen.
    >
      {columns.map((column) => (
        <BoardColumn
          key={column.status}
          column={column}
          catalog={catalog}
          width={columnWidth}
          onPressIssue={onPressIssue}
          onLongPressIssue={onLongPressIssue}
          onAddIssue={onAddIssue}
        />
      ))}
    </ScrollView>
  );
}
