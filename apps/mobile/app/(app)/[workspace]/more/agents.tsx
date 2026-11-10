/**
 * Agents — the workspace's agents, reached from More.
 *
 * A read-only roster in the shared row language: each agent's own icon on its
 * square tile with the presence dot, its name, and its description when it
 * has one. It reads the same cached agent list every avatar in the app
 * resolves against (`agentListOptions`), and hides archived agents, as the
 * More row's avatar preview does. Creating and configuring agents stays on
 * web/desktop.
 */
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Text } from "@/components/ui/text";
import { ListRow } from "@/components/ui/list-row";
import { ActorAvatar } from "@/components/ui/actor-avatar";
import { agentListOptions } from "@/data/queries/agents";
import { useWorkspaceStore } from "@/data/workspace-store";
import { useT } from "@/lib/i18n";

export default function AgentsPage() {
  const wsId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const { t } = useT("workspace");
  const { data, isLoading } = useQuery(agentListOptions(wsId));
  const agents = (data ?? []).filter((agent) => !agent.archived_at);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (agents.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-[15px] leading-[21px] text-muted-foreground text-center">
          {t("agent.empty")}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="pb-6"
      showsVerticalScrollIndicator={false}
    >
      {agents.map((agent) => (
        <ListRow
          key={agent.id}
          label={agent.name}
          description={agent.description || undefined}
          leading={
            <ActorAvatar type="agent" id={agent.id} size={32} showPresence />
          }
        />
      ))}
    </ScrollView>
  );
}
