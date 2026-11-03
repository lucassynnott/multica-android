/**
 * Project entry, shared by the Projects tab, the Projects entry under More and
 * the Pins list.
 *
 * Content is the same everywhere: name, description, completion bar, and a
 * footer carrying the two numbers a project is judged by — how much is done and
 * how much is still open. Status and priority are Badges rather than icon+text
 * pairs, so a column of projects scans as one column of state instead of four
 * different glyph scales. The previous row's status, priority and done/total
 * are all still here; ordering still comes from the caller.
 *
 * Two surfaces, because the two host lists differ:
 *   - `card` (Projects lists) — its own border on the page inset, no separators.
 *   - `row` (Pins, a separator-driven list) — full-bleed with the row inset, so
 *     a card border never sits inside a hairline list.
 */
import { Pressable, View } from "react-native";
import type { Project, ProjectStatus } from "@multica/core/types";
import { Text } from "@/components/ui/text";
import { Badge, CountBadge } from "@/components/ui/badge";
import { ProjectIcon } from "@/components/ui/project-icon";
import { ProjectPriorityIcon } from "@/components/ui/project-priority-icon";
import { ProjectProgress } from "@/components/project/project-progress";
import {
  projectPriorityLabel,
  projectStatusLabel,
} from "@/lib/project-status";
import { useT } from "@/lib/i18n";

type BadgeVariant = "outline" | "secondary" | "info" | "success" | "warning";

const STATUS_VARIANT: Record<ProjectStatus, BadgeVariant> = {
  planned: "outline",
  in_progress: "info",
  paused: "warning",
  completed: "success",
  cancelled: "outline",
};

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
  const open = Math.max(0, total - done);
  const isCard = variant === "card";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={project.title}
      className={`gap-3 active:bg-secondary ${
        isCard
          ? "rounded-xl border border-border bg-card p-4"
          : "px-4 py-3"
      }`}
    >
      <View className="flex-row items-start gap-3">
        <ProjectIcon icon={project.icon} size="lg" />
        <View className="flex-1 gap-1">
          <Text
            className="text-[14px] font-semibold text-foreground"
            numberOfLines={2}
          >
            {project.title}
          </Text>
          {project.description ? (
            <Text
              className="text-[12px] leading-4 text-muted-foreground"
              numberOfLines={2}
            >
              {project.description}
            </Text>
          ) : null}
        </View>
        <Badge
          variant={STATUS_VARIANT[project.status]}
          label={projectStatusLabel(project.status)}
        />
      </View>

      {total > 0 ? <ProjectProgress done={done} total={total} /> : null}

      {total > 0 || project.priority !== "none" ? (
        <View className="flex-row items-center gap-2">
          {total > 0 ? (
            <Text
              className="flex-1 text-[12px] text-muted-foreground tabular-nums"
              numberOfLines={1}
            >
              {t("list.issues_done", { done, total })}
            </Text>
          ) : (
            <View className="flex-1" />
          )}
          {project.priority !== "none" ? (
            <Badge variant="outline" className="gap-1">
              <ProjectPriorityIcon priority={project.priority} size={11} />
              <Badge.Text>{projectPriorityLabel(project.priority)}</Badge.Text>
            </Badge>
          ) : null}
          {total > 0 ? <CountBadge value={open} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}
