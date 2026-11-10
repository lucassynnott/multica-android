/**
 * Project picker route for the in-progress new-issue draft. Uses the same
 * native iOS Stack header + UISearchController pattern as
 * `issue/[id]/picker/project.tsx`.
 */
import { router } from "expo-router";
import { ProjectPickerBody } from "@/components/issue/pickers/project-picker-body";
import { useNewIssueDraftStore } from "@/data/stores/new-issue-draft-store";
import { View } from "react-native";
import { PickerSearchField } from "@/components/ui/picker-search-field";
import { usePickerSearch } from "@/lib/use-native-search-bar";
import { useT } from "@/lib/i18n";

export default function NewIssueProjectPickerRoute() {
  const { t } = useT("issues");
  const project = useNewIssueDraftStore((s) => s.project);
  const setProject = useNewIssueDraftStore((s) => s.setProject);
  const search = usePickerSearch(t("picker.search_projects"), { autoFocus: true });

  return (
    <View className="flex-1">
      <PickerSearchField search={search} />
      <ProjectPickerBody
        value={project}
        query={search.query}
        onChange={(next) => {
          setProject(next);
          router.back();
        }}
      />
    </View>
  );
}
