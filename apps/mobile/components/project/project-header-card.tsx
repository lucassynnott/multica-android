/**
 * Top of the project detail screen: icon + title, the description in full (no
 * truncation), then the completion line and bar. It sits straight on the page
 * — the project is the screen, so it needs no panel around it. The whole
 * block is the edit affordance; a missing description reads as an action in
 * the accent.
 *
 * Progress mirrors web `packages/views/projects/components/project-detail.tsx:596-620`:
 * a bar driven by `Project.done_count / Project.issue_count` plus an "X / Y"
 * label and a percentage. Hidden when there are zero issues — an empty bar
 * gives no information and creates a divide-by-zero hazard.
 *
 * (The file keeps its historical name; nothing here is a card any more.)
 */
import { Pressable, View } from "react-native";
import type { Project } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ProjectIcon } from "@/components/ui/project-icon";
import { ProjectProgress } from "@/components/project/project-progress";
import { useT } from "@/lib/i18n";

interface Props {
  project: Project;
  onEdit?: () => void;
}

export function ProjectHeaderCard({ project, onEdit }: Props) {
  const { t } = useT("projects");
  const total = project.issue_count;
  const done = project.done_count;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Pressable
      onPress={onEdit}
      disabled={!onEdit}
      accessibilityRole={onEdit ? "button" : undefined}
      className="min-h-11 gap-2 px-5 pb-4 pt-1 active:bg-secondary"
    >
      <View className="flex-row items-start gap-3">
        <View className="h-[29px] justify-center">
          <ProjectIcon icon={project.icon} size="md" />
        </View>
        <Text
          className="flex-1 text-[22px] font-semibold leading-[29px] text-foreground"
          selectable
        >
          {project.title}
        </Text>
      </View>
      {project.description ? (
        <Text
          className="text-[15px] leading-[21px] text-muted-foreground"
          selectable
        >
          {project.description}
        </Text>
      ) : onEdit ? (
        <Text className="text-[15px] leading-[21px] text-primary">
          {t("detail.add_description")}
        </Text>
      ) : null}
      {total > 0 ? (
        <View className="gap-2 pt-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] text-muted-foreground">
              {t("detail.progress")}
            </Text>
            <Text className="font-mono text-xs text-muted-foreground">
              {done} / {total} · {pct}%
            </Text>
          </View>
          <ProjectProgress done={done} total={total} />
        </View>
      ) : null}
    </Pressable>
  );
}
