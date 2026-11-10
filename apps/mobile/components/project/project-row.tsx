/**
 * Project entry, shared by the Projects tab, the Projects entry under More and
 * the Pins list.
 *
 * A list row, not a card (DESIGN.md "Lists, not cards"): icon, name at 15, one
 * 13 muted line with the status and how much is done, a 2dp completion bar,
 * and the priority as trailing 12 meta — vermilion and 600 only when urgent.
 * Ordering still comes from the caller.
 *
 * `card` is kept for a host that has no separators of its own: the same
 * content inside one bordered panel.
 */
import { Pressable, View } from "react-native";
import type { Project } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { ProjectIcon } from "@/components/ui/project-icon";
import { ProjectProgress } from "@/components/project/project-progress";
import {
  projectPriorityLabel,
  projectStatusLabel,
} from "@/lib/project-status";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  project: Project;
  onPress: () => void;
  /** `card` owns its border; `row` is full-bleed for separator-driven lists. */
  variant?: "card" | "row";
}

export function ProjectRow({ project, onPress, variant = "row" }: Props) {
  const { t } = useT("projects");
  const total = project.issue_count;
  const done = project.done_count;
  const urgent = project.priority === "urgent";
  const status = projectStatusLabel(project.status);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={project.title}
      className={cn(
        "min-h-11 flex-row items-start gap-3 active:bg-secondary",
        variant === "card"
          ? "rounded-lg border border-border bg-card p-4"
          : "px-5 py-3",
      )}
    >
      <View className="h-[21px] justify-center">
        <ProjectIcon icon={project.icon} size="sm" />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text
          className="text-[15px] leading-[21px] text-foreground"
          numberOfLines={2}
        >
          {project.title}
        </Text>
        <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
          {total > 0
            ? `${status} · ${t("list.issues_done", { done, total })}`
            : status}
        </Text>
        {total > 0 ? (
          <View className="pt-1">
            <ProjectProgress done={done} total={total} />
          </View>
        ) : null}
      </View>
      {project.priority !== "none" ? (
        <Text
          className={cn(
            "shrink-0 text-xs leading-[21px]",
            urgent ? "font-semibold text-primary" : "text-muted-foreground",
          )}
          numberOfLines={1}
        >
          {projectPriorityLabel(project.priority)}
        </Text>
      ) : null}
    </Pressable>
  );
}
