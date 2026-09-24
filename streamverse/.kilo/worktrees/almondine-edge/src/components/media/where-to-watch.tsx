import Image from "next/image";
import { ExternalLink, Clapperboard } from "lucide-react";

import type { WatchProvider } from "@/types/media-item";
import { Button } from "@/components/ui/button";

const TYPE_LABELS: Record<WatchProvider["type"], string> = {
  free: "Free",
  stream: "Stream",
  rent: "Rent",
  buy: "Buy",
};

const TYPE_ORDER: WatchProvider["type"][] = ["free", "stream", "rent", "buy"];

/**
 * Outbound "Where to Watch" links only. StreamVerse never embeds or proxies
 * copyrighted streams — every action links out to an official provider.
 */
export function WhereToWatch({
  providers,
  watchLink,
  title,
}: {
  providers: WatchProvider[];
  watchLink?: string;
  title: string;
}) {
  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: providers.filter((p) => p.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="glass space-y-4 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Where to Watch</h2>
        {watchLink ? (
          <Button asChild variant="secondary" size="sm">
            <a href={watchLink} target="_blank" rel="noreferrer noopener">
              View options
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        ) : null}
      </div>

      {grouped.length > 0 ? (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.type} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {TYPE_LABELS[group.type]}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.items.map((provider, i) => (
                  <a
                    key={`${provider.name}-${i}`}
                    href={watchLink ?? "#"}
                    target={watchLink ? "_blank" : undefined}
                    rel="noreferrer noopener"
                    title={`${provider.name} — opens official provider`}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1.5 text-sm transition hover:border-primary/60"
                  >
                    {provider.logoUrl ? (
                      <Image
                        src={provider.logoUrl}
                        alt={provider.name}
                        width={24}
                        height={24}
                        className="rounded"
                      />
                    ) : (
                      <Clapperboard className="size-5 text-muted-foreground" />
                    )}
                    <span>{provider.name}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No official streaming options found for{" "}
          <span className="font-medium">{title}</span> in your region right now.
        </p>
      )}
    </section>
  );
}
