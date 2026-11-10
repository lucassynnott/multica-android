import { ChatNoticeRow } from "./offline-banner";
import { useT } from "@/lib/i18n";

export function RuntimeRequiredBanner({ agentName }: { agentName?: string }) {
  const { t } = useT("chat");
  const name = agentName?.trim() || t("title.this_agent");
  return (
    <ChatNoticeRow
      icon="server-outline"
      text={t("banners.runtime_required_name", { name })}
    />
  );
}
