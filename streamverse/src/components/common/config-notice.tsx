import { AlertTriangle } from "lucide-react";

/**
 * Shown in place of data when a required external service isn't configured yet
 * (e.g. no TMDB key). Keeps the app usable/reviewable without secrets.
 */
export function ConfigNotice({
  service,
  detail,
}: {
  service: string;
  detail: string;
}) {
  return (
    <div className="glass flex items-start gap-3 rounded-xl p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-yellow-500" />
      <div className="space-y-1">
        <p className="font-medium">{service} isn&apos;t configured yet</p>
        <p className="text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
