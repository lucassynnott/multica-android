/**
 * One kanban column: a 48dp header (name 13/600, mono count, activity trace,
 * "+") over a vertically scrolling stack of cards. Columns are divided by a
 * hairline on the right instead of a gutter, and the width is passed in from
 * the board so every column on screen agrees on geometry.
 *
 * The stack is a FlatList, so a column with hundreds of cards mounts only the
 * ones near the viewport.
 */
import { FlatList, Pressable, View } from "react-native";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { BoardCard } from "./board-card";
import { BoardTrace } from "./board-trace";
import type { BoardColumnModel } from "@/lib/board";
import type { IssueStatusCatalog } from "@/lib/issue-status";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";
import { useT } from "@/lib/i18n";

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
  const { t } = useT("issues");
  // The header can only name the status when the catalog knows it. A key the
  // catalog has never heard of (a legacy or deleted custom status) leaves the
  // header showing a raw key with no category signal, so those cards carry
  // their own StatusBadge.
  const columnNamesStatus = catalog.entryOf(column.status) !== undefined;

  return (
    <View style={{ width }} className="flex-1 border-r border-border">
      <View className="h-12 flex-row items-center gap-2 border-b border-border pl-4 pr-0.5">
        <Text
          accessibilityRole="header"
          className="shrink text-[13px] font-semibold text-foreground"
          numberOfLines={1}
        >
          {column.title}
        </Text>
        <Text className="font-mono text-xs text-muted-foreground">
          {column.issues.length}
        </Text>
        <View className="flex-1" />
        <BoardTrace issues={column.issues} />
        <Pressable
          onPress={() => onAddIssue(column.status)}
          className="h-11 w-11 items-center justify-center rounded-lg active:bg-secondary"
          accessibilityRole="button"
          accessibilityLabel={t("board.add_to_column", { status: column.title })}
        >
          <Ionicons
            name="add"
            size={18}
            color={THEME[colorScheme].mutedForeground}
          />
        </Pressable>
      </View>

      <FlatList
        data={column.issues}
        keyExtractor={(issue) => issue.id}
        // Re-render rows when the dragged card changes, not only when data does.
        extraData={draggingIssueId}
        renderItem={({ item }) => (
          <BoardCard
            issue={item}
            dragging={draggingIssueId === item.id}
            onPress={onPressIssue}
            onLongPress={onLongPressIssue}
            showStatus={!columnNamesStatus}
            statusLabel={catalog.labelOf(item.status)}
            statusCategory={catalog.categoryOf(item.status)}
            statusColor={catalog.colorOf(item.status)}
          />
        )}
        ListEmptyComponent={
          <View className="h-16 items-center justify-center rounded-lg border border-dashed border-border">
            <Text className="text-[13px] text-muted-foreground">
              {t("board.empty_column")}
            </Text>
          </View>
        }
        initialNumToRender={8}
        windowSize={7}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, padding: 10, paddingBottom: 32 }}
        // While a card is being dragged the column must not scroll under it;
        // the board owns that gesture.
        scrollEnabled={!draggingIssueId}
      />
    </View>
  );
}
