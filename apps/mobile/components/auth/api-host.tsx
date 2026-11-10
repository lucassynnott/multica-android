/**
 * The API host this build talks to, as a quiet mono line under the sign-in
 * form. On a self-hosted or staging build it is the one thing that tells a
 * user which server their code is being sent to.
 *
 * Read from the same `EXPO_PUBLIC_API_URL` that `data/api.ts` uses; shows the
 * host only (no scheme, no path). Renders nothing when the variable is unset.
 * A hostname is not translatable copy, so it does not go through `useT`.
 */
import { Text } from "@/components/ui/text";

const API_HOST = (process.env.EXPO_PUBLIC_API_URL ?? "")
  .trim()
  .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
  .replace(/[/?#].*$/, "");

export function ApiHost() {
  if (!API_HOST) return null;
  return (
    <Text
      className="font-mono text-xs text-muted-foreground"
      numberOfLines={1}
      selectable
    >
      {API_HOST}
    </Text>
  );
}
