/**
 * New project modal. Mirrors `new-issue.tsx` shape — vertical form, header
 * Cancel / Create buttons. Title is required; everything else has a default
 * (status=planned, priority=none, no lead, no description, no icon).
 *
 * Lead is intentionally NOT exposed in the create form. Web does the same:
 * lead assignment is a follow-up action because most users create the
 * project from a "I need to track this stream of work" intent and figure
 * out who's leading it later. The picker lives on the detail screen.
 *
 * Status / priority cross-route through `useNewProjectDraftStore` so the
 * formSheet picker routes can read/write them — same pattern as
 * new-issue.tsx + new-issue-picker/* (see new-project-draft-store.ts).
 *
 * On success: dismiss modal → navigate to the new project's detail page so
 * the user can immediately add a lead / attach issues / configure properties.
 */
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  InteractionManager,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { Text } from "@/components/ui/text";
import {
  FormField,
  FormHeaderAction,
  FormHeaderCancel,
  ProjectFormFields,
} from "@/components/project/project-form";
import { ProjectStatusIcon } from "@/components/ui/project-status-icon";
import { ProjectPriorityIcon } from "@/components/ui/project-priority-icon";
import {
  projectPriorityLabel,
  projectStatusLabel,
} from "@/lib/project-status";
import { useCreateProject } from "@/data/mutations/projects";
import { useNewProjectDraftStore } from "@/data/stores/new-project-draft-store";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";
import { useDiscardGuard } from "@/lib/use-discard-guard";

/**
 * Typed map of new-project picker route pathnames. Keeps `router.push` calls
 * compile-checked rather than depending on free-form template strings —
 * same approach as `create-form-attribute-row.tsx`.
 */
type NewProjectPickerField = "status" | "priority";
const NEW_PROJECT_PICKER_PATHNAMES = {
  status: "/[workspace]/new-project-picker/status",
  priority: "/[workspace]/new-project-picker/priority",
} as const satisfies Record<NewProjectPickerField, string>;

export default function NewProject() {
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { t } = useT("projects");
  const create = useCreateProject();

  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const status = useNewProjectDraftStore((s) => s.status);
  const priority = useNewProjectDraftStore((s) => s.priority);
  const resetDraft = useNewProjectDraftStore((s) => s.reset);

  const dirty =
    title.length > 0 ||
    icon.length > 0 ||
    description.length > 0 ||
    status !== "planned" ||
    priority !== "none";

  const canCreate = title.trim().length > 0 && !create.isPending;

  const openPicker = useCallback(
    (field: NewProjectPickerField) => {
      if (!wsSlug) return;
      router.push({
        pathname: NEW_PROJECT_PICKER_PATHNAMES[field],
        params: { workspace: wsSlug },
      });
    },
    [wsSlug],
  );

  const leave = useDiscardGuard(dirty && !create.isSuccess, {
    title: t("form.discard_title"),
    message: t("form.discard_message"),
    keep: t("form.keep_editing"),
    discard: t("common:actions.discard"),
  });

  // The draft store outlives this screen, so every exit has to clear it —
  // including the system back button, which runs none of the handlers below.
  useEffect(() => () => resetDraft(), [resetDraft]);

  const onCancel = useCallback(() => {
    if (!dirty) {
      resetDraft();
      leave();
      return;
    }
    Alert.alert(
      t("form.discard_title"),
      t("form.discard_message"),
      [
        { text: t("form.keep_editing"), style: "cancel" },
        {
          text: t("common:actions.discard"),
          style: "destructive",
          onPress: () => {
            resetDraft();
            leave();
          },
        },
      ],
    );
  }, [dirty, leave, resetDraft, t]);

  const onCreate = useCallback(() => {
    if (!canCreate) return;
    create.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        icon: icon.trim() || undefined,
        status,
        priority,
      },
      {
        onSuccess: (project) => {
          resetDraft();
          leave();
          // Wait for the modal dismiss animation to finish before pushing
          // the detail screen. `InteractionManager` resolves once iOS
          // says all in-flight animations / interactions are done — more
          // robust than a hard-coded `setTimeout(150)` if iOS timing
          // changes or the device is under load.
          InteractionManager.runAfterInteractions(() => {
            if (wsSlug) router.push(`/${wsSlug}/project/${project.id}`);
          });
        },
        onError: (err) => {
          Alert.alert(
            t("form.save_failed"),
            err instanceof Error ? err.message : t("common:states.error"),
          );
        },
      },
    );
  }, [
    leave,
    canCreate,
    create,
    title,
    description,
    icon,
    status,
    priority,
    wsSlug,
    resetDraft,
    t,
  ]);

  const headerLeft = useCallback(
    () => (
      <FormHeaderCancel label={t("common:actions.cancel")} onPress={onCancel} />
    ),
    [onCancel, t],
  );

  const headerRight = useCallback(
    () => (
      <FormHeaderAction
        label={
          create.isPending ? t("actions.creating") : t("common:actions.create")
        }
        onPress={onCreate}
        disabled={!canCreate}
      />
    ),
    [canCreate, onCreate, create.isPending, t],
  );

  return (
    <>
      <Stack.Screen options={{ headerLeft, headerRight }} />
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-5 pb-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <ProjectFormFields
            icon={icon}
            onChangeIcon={setIcon}
            title={title}
            onChangeTitle={setTitle}
            description={description}
            onChangeDescription={setDescription}
            autoFocusTitle
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField label={t("properties.status")}>
                <Pressable
                  onPress={() => openPicker("status")}
                  accessibilityRole="button"
                  className="h-11 flex-row items-center gap-2 rounded-lg border border-border bg-card px-3 active:bg-secondary"
                >
                  <ProjectStatusIcon status={status} size={16} />
                  <Text
                    className="flex-1 text-[15px] text-foreground"
                    numberOfLines={1}
                  >
                    {projectStatusLabel(status)}
                  </Text>
                </Pressable>
              </FormField>
            </View>
            <View className="flex-1">
              <FormField label={t("properties.priority")}>
                <Pressable
                  onPress={() => openPicker("priority")}
                  accessibilityRole="button"
                  className="h-11 flex-row items-center gap-2 rounded-lg border border-border bg-card px-3 active:bg-secondary"
                >
                  <ProjectPriorityIcon priority={priority} size={16} />
                  <Text
                    className="flex-1 text-[15px] text-foreground"
                    numberOfLines={1}
                  >
                    {projectPriorityLabel(priority)}
                  </Text>
                </Pressable>
              </FormField>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
