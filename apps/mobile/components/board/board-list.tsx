/**
 * The list view of a board: every status column as a group of dense rows.
 *
 * Same columns, same order and same actions as the kanban (`BoardCanvas`); it
 * is the other way to look at one model, not a second issue list. A row opens
 * the issue on tap and the move sheet on long-press, exactly like a card.
 *
 * Virtualised with SectionList because a workspace can hold hundreds of
 * issues. Empty statuses keep their header: it is where "+" creates into, and
 * it keeps the group order stable while cards move between statuses.
 */
import { memo, useMemo } from "react";
import { Pressable, SectionList, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Issue } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { useActorLookup } from "@/data/use-actor-name";
import type { BoardColumnModel } from "@/lib/board";
import { THEME } from "@/lib/theme";
import { useColorScheme } from "@/lib/use-color-scheme";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { BoardTrace } from "./board-trace";
import { useIssueMeta } from "./issue-meta";

interface Props {
  columns: BoardColumnModel[];
  onPressIssue: (issue: Issue) => void;
  onLongPressIssue: (issue: Issue) => void;
  onAddIssue: (status: string) => void;
  /** The issue open in the detail pane beside the list, if any. */
  selectedId?: string | null;
  /**
   * Two-line rows for the ~300dp list column of a list + detail split: the
   * id, meta and avatar on one line and the title below it, so the title
   * gets the full column instead of what is left beside a 62dp id.
   */
  stacked?: boolean;
}

interface Section {
  column: BoardColumnModel;
  data: Issue[];
}

export function BoardList({
  columns,
  onPressIssue,
  onLongPressIssue,
  onAddIssue,
  selectedId = null,
  stacked = false,
}: Props) {
  const sections = useMemo<Section[]>(
    () => columns.map((column) => ({ column, data: column.issues })),
    [columns],
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={(issue) => issue.id}
      renderSectionHeader={({ section }) => (
        <GroupHeader
          column={section.column}
          // The screen header (or the picker row) already draws the hairline
          // above the first group.
          first={section.column === columns[0]}
          onAddIssue={onAddIssue}
        />
      )}
      renderItem={({ item }) => (
        <BoardRow
          issue={item}
          onPress={onPressIssue}
          onLongPress={onLongPressIssue}
          selected={item.id === selectedId}
          stacked={stacked}
        />
      )}
      extraData={selectedId}
      stickySectionHeadersEnabled={false}
      initialNumToRender={16}
      windowSize={9}
      contentContainerStyle={{ paddingBottom: 32 }}
    />
  );
}

function GroupHeader({
  column,
  first,
  onAddIssue,
}: {
  column: BoardColumnModel;
  first: boolean;
  onAddIssue: (status: string) => void;
}) {
  const { t } = useT("issues");
  const { colorScheme } = useColorScheme();
  return (
    <View
      className={cn(
        "h-11 flex-row items-center gap-2.5 pl-5 pr-1.5",
        !first && "border-t border-border",
      )}
    >
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
        accessibilityRole="button"
        accessibilityLabel={t("board.add_to_column", { status: column.title })}
        className="h-11 w-11 items-center justify-center rounded-lg active:bg-secondary"
      >
        <Ionicons
          name="add"
          size={18}
          color={THEME[colorScheme].mutedForeground}
        />
      </Pressable>
    </View>
  );
}

const BoardRow = memo(function BoardRow({
  issue,
  onPress,
  onLongPress,
  selected,
  stacked,
}: {
  issue: Issue;
  onPress: (issue: Issue) => void;
  onLongPress: (issue: Issue) => void;
  selected: boolean;
  stacked: boolean;
}) {
  const { t } = useT("issues");
  const meta = useIssueMeta(issue);
  const { getName } = useActorLookup();
  const assigned = Boolean(issue.assignee_type && issue.assignee_id);
  const assignee = assigned
    ? getName(issue.assignee_type, issue.assignee_id)
    : t("board.unassigned");
  const label = [issue.identifier, issue.title, meta?.text, assignee]
    .filter(Boolean)
    .join(", ");
  const metaText = meta ? (
    <Text
      className={cn(
        "text-xs leading-[21px]",
        meta.urgent ? "font-semibold text-primary" : "text-muted-foreground",
      )}
      numberOfLines={1}
    >
      {meta.text}
    </Text>
  ) : null;

  if (stacked) {
    return (
      <Pressable
        onPress={() => onPress(issue)}
        onLongPress={() => onLongPress(issue)}
        delayLongPress={260}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        className={cn(
          "min-h-11 gap-1 px-5 py-2.5 active:bg-secondary",
          selected && "bg-secondary",
        )}
      >
        <View className="flex-row items-center gap-2">
          <Text
            className="min-w-0 flex-1 font-mono text-xs leading-[21px] text-muted-foreground"
            numberOfLines={1}
          >
            {issue.identifier}
          </Text>
          {metaText}
          {assigned ? (
            <ActorAvatar
              type={issue.assignee_type}
              id={issue.assignee_id}
              size={20}
            />
          ) : null}
        </View>
        <Text className="text-[15px] leading-[21px] text-foreground">
          {issue.title}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(issue)}
      onLongPress={() => onLongPress(issue)}
      delayLongPress={260}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={cn(
        "min-h-11 flex-row items-start gap-3 px-5 py-2.5 active:bg-secondary",
        selected && "bg-secondary",
      )}
    >
      {/* 21dp line boxes on all three texts keep the 12px id and meta on the
          title's first line without relying on baseline alignment. */}
      <Text
        className="w-[62px] font-mono text-xs leading-[21px] text-muted-foreground"
        numberOfLines={1}
      >
        {issue.identifier}
      </Text>
      <Text className="flex-1 text-[15px] leading-[21px] text-foreground">
        {issue.title}
      </Text>
      {metaText}
      {/* Unassigned keeps the slot so the meta column stays aligned. */}
      <View className="h-[22px] w-[22px]">
        {assigned ? (
          <ActorAvatar
            type={issue.assignee_type}
            id={issue.assignee_id}
            size={22}
          />
        ) : null}
      </View>
    </Pressable>
  );
});
