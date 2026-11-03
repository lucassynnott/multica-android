/**
 * Header card for the project detail screen: icon + title on one line, the
 * description in full (no truncation) below, then the completion bar.
 *
 * Mirrors the visual emphasis of web's `project-header.tsx` but in a single
 * surface instead of the web sidebar layout — phones don't have the horizontal
 * real estate for a side-by-side header + properties layout. The whole card is
 * the edit affordance, so tapping it opens the edit sheet.
 *
 * Progress mirrors web `packages/views/projects/components/project-detail.tsx:596-620`:
 * a bar driven by `Project.done_count / Project.issue_count` plus an "X / Y"
 * label and a percentage. Hidden when there are zero issues — an empty bar
 * gives no information and creates a divide-by-zero hazard.
 */
import { View } from "react-native";
import type { Project } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { CardPressable } from "@/components/ui/card";
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
    <CardPressable
      onPress={onEdit}
      disabled={!onEdit}
      accessibilityRole={onEdit ? "button" : undefined}
      className="gap-3"
    >
      <View className="flex-row items-start gap-3">
        <ProjectIcon icon={project.icon} size="lg" />
        <Text
          className="flex-1 text-[20px] font-semibold leading-[26px] text-foreground"
          selectable
        >
          {project.title}
        </Text>
      </View>

      {project.description ? (
        <Text className="text-[13px] leading-5 text-muted-foreground" selectable>
          {project.description}
        </Text>
      ) : onEdit ? (
        <Text className="text-[13px] text-muted-foreground/70">
          {t("detail.add_description")}
        </Text>
      ) : null}

      {total > 0 ? (
        <View className="gap-2 pt-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] text-muted-foreground">
              {t("detail.progress")}
            </Text>
            <Text className="text-[11px] text-muted-foreground tabular-nums">
              {done} / {total} · {pct}%
            </Text>
          </View>
          <ProjectProgress done={done} total={total} />
        </View>
      ) : null}
    </CardPressable>
  );
}
