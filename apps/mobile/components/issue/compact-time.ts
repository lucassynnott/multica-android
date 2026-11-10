import { i18n } from "@/lib/i18n/singleton";

/**
 * Relative time short enough for the mono time column of the issue activity
 * list ("now", "20m", "1h", "3d"). `lib/time-ago` spells the same value out
 * ("20m ago"), which does not fit a fixed narrow column.
 */
export function compactTimeAgo(dateStr: string): string {
  const t = i18n.t.bind(i18n);
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);

  if (minutes < 1) return t("issues:time_short.now");
  if (minutes < 60) return t("issues:time_short.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("issues:time_short.hours", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("issues:time_short.days", { count: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return t("issues:time_short.weeks", { count: weeks });

  return new Date(dateStr).toLocaleDateString(
    i18n.resolvedLanguage ?? i18n.language,
    { month: "numeric", day: "numeric" },
  );
}
