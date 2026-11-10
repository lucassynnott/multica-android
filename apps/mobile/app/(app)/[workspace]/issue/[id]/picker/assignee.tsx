/**
 * Assignee picker route for an existing issue. Uses the native iOS Stack
 * header + UISearchController (registered in ../_layout.tsx with
 * `headerShown: true` + title); the search bar wiring is encapsulated in
 * `useNativeSearchBar`.
 */
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AssigneePickerBody } from "@/components/issue/pickers/assignee-picker-body";
import { issueDetailOptions } from "@/data/queries/issues";
import { useUpdateIssue } from "@/data/mutations/issues";
import { useWorkspaceStore } from "@/data/workspace-store";
import { View } from "react-native";
import { PickerSearchField } from "@/components/ui/picker-search-field";
import { usePickerSearch } from "@/lib/use-native-search-bar";
import { useT } from "@/lib/i18n";

export default function IssueAssigneePickerRoute() {
  const { t } = useT("issues");
  const { id } = useLocalSearchParams<{ id: string }>();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { data: issue } = useQuery(issueDetailOptions(wsId, id));
  const updateIssue = useUpdateIssue(id);
  const search = usePickerSearch(t("picker.search_people"), { autoFocus: true });

  const value =
    issue?.assignee_type && issue?.assignee_id
      ? { type: issue.assignee_type, id: issue.assignee_id }
      : null;

  return (
    <View className="flex-1">
      <PickerSearchField search={search} />
      <AssigneePickerBody
        value={value}
        query={search.query}
        onChange={(next) => {
          if (next === null) {
            updateIssue.mutate({ assignee_type: null, assignee_id: null });
          } else {
            updateIssue.mutate({
              assignee_type: next.type,
              assignee_id: next.id,
            });
          }
          router.back();
        }}
      />
    </View>
  );
}
