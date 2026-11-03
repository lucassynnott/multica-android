/**
 * One kanban column: a status header with its live card count and a
 * vertically scrolling card stack. The header is sticky within the column so
 * a long column keeps its identity while scrolling, and the width is passed
 * in from the board so every column on screen agrees on geometry.
 *
 * Header is name (13/600) + CountBadge + one quiet action. The status colour
 * survives as an 8 px dot instead of the full glyph: the column title is the
 * identity, the dot is the only thing a custom status can say that its name
 * cannot.
 */
import { Pressable, ScrollView, View } from "react-native";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { CountBadge } from "@/components/ui/badge";
import { Ionicons } from "@expo/vector-icons";
import { BoardCard } from "./board-card";
import type { BoardColumnModel } from "@/lib/board";
import type { IssueStatusCatalog } from "@/lib/issue-status";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

interface Props {
  column: BoardColumnModel;
  catalog: IssueStatusCatalog;
  width: number;
  onPressIssue: (issue: Issue) => void;
  onLongPressIssue: (issue: Issue) => void;
  onAddIssue: (status: string) => void;
  draggingIssueId?: string | null;
}

export function BoardColumn({
  column,
  catalog,
  width,
  onPressIssue,
  onLongPressIssue,
  onAddIssue,
  draggingIssueId,
}: Props) {
  const { colorScheme } = useColorScheme();
  const muted = THEME[colorScheme].mutedForeground;
  const color = column.color ?? catalog.colorOf(column.status);
  // The header can only name the status when the catalog knows it. A key the
  // catalog has never heard of (a legacy or deleted custom status) leaves the
  // header showing a raw key with no category signal, so those cards carry
  // their own StatusBadge.
  const columnNamesStatus = catalog.entryOf(column.status) !== undefined;

  return (
    <View style={{ width }} className="flex-1">
      <View className="mb-3 h-10 flex-row items-center gap-2">
        <View
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color ?? muted }}
        />
        <Text
          className="shrink text-[13px] font-semibold text-foreground"
          numberOfLines={1}
        >
          {column.title}
        </Text>
        <CountBadge value={column.issues.length} />
        <View className="flex-1" />
        <Pressable
          onPress={() => onAddIssue(column.status)}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center rounded-md active:bg-secondary"
          accessibilityLabel={`Add issue to ${column.title}`}
        >
          <Ionicons name="add" size={16} color={muted} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
        // While a card is being dragged the column must not scroll under it;
        // the board owns that gesture.
        scrollEnabled={!draggingIssueId}
      >
        {column.issues.length === 0 ? (
          <View
            style={{ width }}
            className="h-16 items-center justify-center rounded-xl border border-dashed border-border"
          >
            <Text className="text-[11px] text-muted-foreground">{"\u2014"}</Text>
          </View>
        ) : (
          column.issues.map((issue) => (
            <BoardCard
              key={issue.id}
              issue={issue}
              width={width}
              dragging={draggingIssueId === issue.id}
              onPress={() => onPressIssue(issue)}
              onLongPress={() => onLongPressIssue(issue)}
              showStatus={!columnNamesStatus}
              statusLabel={catalog.labelOf(issue.status)}
              statusCategory={catalog.categoryOf(issue.status)}
              statusColor={catalog.colorOf(issue.status)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
