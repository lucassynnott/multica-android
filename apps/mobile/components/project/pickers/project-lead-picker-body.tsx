/**
 * Pure picker body for project lead — single-select over members + agents
 * with an Unassigned row. Mirrors the assignee picker pattern: header +
 * search bar are owned by the iOS native nav header registered in
 * `app/(app)/[workspace]/_layout.tsx`; the route wires `query` in via
 * `useNativeSearchBar` and passes it through. Body is a pure FlatList.
 *
 * Flat list with inline "Agent" right-aligned tag — matches Apple's
 * UITableViewCellStyleValue1 pattern (used throughout Settings); at this
 * row count (~10–30) inline tag beats SectionList headers (which would
 * eat ~8% of the sheet height).
 */
import { useMemo } from "react";
import { FlatList, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { Agent, MemberWithUser } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { PickerRow } from "@/components/ui/picker-row";
import { agentListOptions } from "@/data/queries/agents";
import { memberListOptions } from "@/data/queries/members";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useScrollToTopOnChange } from "@/lib/use-scroll-to-top-on-change";
import { useT } from "@/lib/i18n";
import { useColorScheme } from "@/lib/use-color-scheme";
import { THEME } from "@/lib/theme";

const AVATAR_SIZE = 28;

export interface LeadValue {
  type: "member" | "agent";
  id: string;
}

interface Props {
  value: LeadValue | null;
  query: string;
  onChange: (next: LeadValue | null) => void;
}

type Row =
  | { kind: "unassigned" }
  | { kind: "member"; member: MemberWithUser }
  | { kind: "agent"; agent: Agent };

function isRowSelected(value: LeadValue | null, row: Row): boolean {
  if (row.kind === "unassigned") return value === null;
  if (value === null) return false;
  if (row.kind === "member")
    return value.type === "member" && value.id === row.member.user_id;
  return value.type === "agent" && value.id === row.agent.id;
}

export function ProjectLeadPickerBody({ value, query, onChange }: Props) {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { t } = useT("issues");
  const { colorScheme } = useColorScheme();
  const { data: members = [] } = useQuery(memberListOptions(wsId));
  const { data: agents = [] } = useQuery(agentListOptions(wsId));
  const listRef = useScrollToTopOnChange(query);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const matchName = (n: string) => !q || n.toLowerCase().includes(q);

    const memberRows: Row[] = [...members]
      .filter((m) => matchName(m.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => ({ kind: "member" as const, member: m }));
    const agentRows: Row[] = [...agents]
      .filter((a) => matchName(a.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => ({ kind: "agent" as const, agent: a }));

    if (q) return [...memberRows, ...agentRows];

    const all = [...memberRows, ...agentRows];
    const selectedRow = all.find((r) => isRowSelected(value, r));
    return [
      { kind: "unassigned" },
      ...(selectedRow ? [selectedRow] : []),
      ...memberRows.filter((r) => !isRowSelected(value, r)),
      ...agentRows.filter((r) => !isRowSelected(value, r)),
    ];
  }, [members, agents, query, value]);

  const select = (row: Row) => {
    if (row.kind === "unassigned") onChange(null);
    else if (row.kind === "member")
      onChange({ type: "member", id: row.member.user_id });
    else onChange({ type: "agent", id: row.agent.id });
  };

  return (
    <FlatList
      ref={listRef}
      data={rows}
      className="flex-1"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      keyExtractor={(row) => {
        if (row.kind === "unassigned") return "unassigned";
        if (row.kind === "member") return `m:${row.member.user_id}`;
        return `a:${row.agent.id}`;
      }}
      renderItem={({ item }) => (
        <PickerRow
          onPress={() => select(item)}
          label={
            item.kind === "unassigned"
              ? t("picker.unassigned")
              : item.kind === "member"
                ? item.member.name
                : item.agent.name
          }
          description={item.kind === "agent" ? t("picker.agent") : undefined}
          leading={
            item.kind === "unassigned" ? (
              <View className="h-7 w-7 items-center justify-center rounded-full border border-dashed border-border">
                <Ionicons
                  name="close-circle-outline"
                  size={16}
                  color={THEME[colorScheme].mutedForeground}
                />
              </View>
            ) : item.kind === "member" ? (
              <ActorAvatar
                type="member"
                id={item.member.user_id}
                size={AVATAR_SIZE}
                showPresence
              />
            ) : (
              <ActorAvatar
                type="agent"
                id={item.agent.id}
                size={AVATAR_SIZE}
                showPresence
              />
            )
          }
          selected={isRowSelected(value, item)}
        />
      )}
      ListEmptyComponent={
        <View className="px-5 py-6">
          <Text className="text-[15px] leading-[21px] text-muted-foreground">
            {query
              ? t("picker.no_matches")
              : t("picker.no_members_agents")}
          </Text>
        </View>
      }
    />
  );
}
