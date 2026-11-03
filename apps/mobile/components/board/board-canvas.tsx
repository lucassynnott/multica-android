/**
 * The board canvas: columns side by side, each scrolling on its own.
 *
 * Shared by the workspace board tab and the board inside a project so the
 * geometry, the gutter and the column behaviour are identical in both places.
 * The caller owns the data, the filters and the header; this owns only how the
 * columns are laid out on screen.
 */
import { ScrollView, View } from "react-native";
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
  const { columnWidth, gap, listPadding } = boardMetrics(layout);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flex: 1 }}
      contentContainerStyle={{
        gap,
        paddingHorizontal: listPadding,
        paddingTop: listPadding,
        // Stretch (the default) gives each column the viewport's height, so
        // its card list scrolls independently instead of growing past the
        // bottom of the screen.
      }}
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
      {/* Trailing gutter so the last column doesn't sit flush to the edge. */}
      <View style={{ width: listPadding - gap }} />
    </ScrollView>
  );
}
