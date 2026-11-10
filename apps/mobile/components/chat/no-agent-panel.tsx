/**
 * The whole Chat screen when the workspace has no agent this user can run.
 * Mirrors the role of packages/views/chat/components/no-agent-banner.tsx on
 * web, but as one panel instead of a banner over a dead composer: it says
 * what is missing, the steps to fix it, and takes the user to More → Agents.
 * The screen hides the composer while this is shown.
 */
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";

const STEPS = [
  { title: "no_agents.step_runtime_title", body: "no_agents.step_runtime_body" },
  { title: "no_agents.step_agent_title", body: "no_agents.step_agent_body" },
  { title: "no_agents.step_return_title", body: "no_agents.step_return_body" },
] as const;

export function NoAgentPanel() {
  const wsSlug = useWorkspaceStore((s) => s.currentWorkspaceSlug);
  const { t } = useT("chat");

  const openAgents = () => {
    if (!wsSlug) return;
    router.push(`/${wsSlug}/more/agents`);
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="w-full max-w-[460px] self-center gap-5 rounded-lg border border-border bg-card p-5">
        <View className="gap-1.5">
          <Text
            role="heading"
            className="text-xl font-semibold text-foreground"
          >
            {t("no_agents.title")}
          </Text>
          <Text className="text-[15px] leading-[22px] text-muted-foreground">
            {t("no_agents.body")}
          </Text>
        </View>

        <View className="gap-3.5">
          {STEPS.map((step, index) => (
            <View key={step.title} className="flex-row gap-3">
              <Text className="w-5 pt-0.5 font-mono text-xs leading-[21px] text-muted-foreground">
                {index + 1}
              </Text>
              <View className="flex-1 gap-0.5">
                <Text className="text-[15px] font-semibold leading-[21px] text-foreground">
                  {t(step.title)}
                </Text>
                <Text className="text-[13px] leading-[19px] text-muted-foreground">
                  {t(step.body)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Button
          className="h-[52px]"
          onPress={openAgents}
          accessibilityLabel={t("no_agents.open_agents")}
        >
          <Text className="text-base font-semibold">
            {t("no_agents.open_agents")}
          </Text>
        </Button>
      </View>
    </ScrollView>
  );
}
