/**
 * Edit project title / description / icon. Modal presentation, configured
 * in `[workspace]/_layout.tsx`. Save button in the header runs an
 * optimistic `useUpdateProject`; the modal dismisses on success.
 *
 * Cancel/dismiss flow: header Cancel + iOS drag-down gesture both check
 * dirty state and pop an Alert if there are unsaved edits.
 */
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import {
  FormHeaderAction,
  FormHeaderCancel,
  ProjectFormFields,
} from "@/components/project/project-form";
import { projectDetailOptions } from "@/data/queries/projects";
import { useUpdateProject } from "@/data/mutations/projects";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";
import { useDiscardGuard } from "@/lib/use-discard-guard";

export default function EditProject() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { t } = useT("projects");
  const detail = useQuery(projectDetailOptions(wsId, id));
  const update = useUpdateProject(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [seeded, setSeeded] = useState(false);

  // Seed once when data arrives, before committing the form. Background
  // refetches must not overwrite edits already in progress.
  if (detail.data && !seeded) {
    setTitle(detail.data.title);
    setDescription(detail.data.description ?? "");
    setIcon(detail.data.icon ?? "");
    setSeeded(true);
  }

  const dirty = useMemo(() => {
    if (!detail.data) return false;
    return (
      title.trim() !== detail.data.title ||
      description.trim() !== (detail.data.description ?? "") ||
      icon.trim() !== (detail.data.icon ?? "")
    );
  }, [detail.data, title, description, icon]);

  const canSave =
    seeded && title.trim().length > 0 && dirty && !update.isPending;

  const leave = useDiscardGuard(dirty && !update.isSuccess, {
    title: t("form.discard_title"),
    message: t("form.discard_message"),
    keep: t("form.keep_editing"),
    discard: t("common:actions.discard"),
  });

  const onCancel = useCallback(() => {
    if (!dirty) {
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
          onPress: () => leave(),
        },
      ],
    );
  }, [dirty, leave, t]);

  const onSave = useCallback(() => {
    if (!canSave) return;
    const patch = {
      title: title.trim(),
      description: description.trim() || null,
      icon: icon.trim() || null,
    };
    update.mutate(patch, {
      onSuccess: () => leave(),
      onError: (err) => {
        Alert.alert(
          t("form.save_failed_edit"),
          err instanceof Error ? err.message : t("common:states.error"),
        );
      },
    });
  }, [canSave, title, description, icon, update, leave, t]);

  const headerLeft = useCallback(
    () => (
      <FormHeaderCancel label={t("common:actions.cancel")} onPress={onCancel} />
    ),
    [onCancel, t],
  );

  const headerRight = useCallback(
    () => (
      <FormHeaderAction
        label={update.isPending ? t("actions.saving") : t("common:actions.save")}
        onPress={onSave}
        disabled={!canSave}
      />
    ),
    [canSave, onSave, update.isPending, t],
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
          {!detail.data ? (
            <Text className="text-[15px] text-muted-foreground">
              {t("common:states.loading")}
            </Text>
          ) : (
            <ProjectFormFields
              icon={icon}
              onChangeIcon={setIcon}
              title={title}
              onChangeTitle={setTitle}
              description={description}
              onChangeDescription={setDescription}
              autoFocusTitle={!detail.data.title}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
