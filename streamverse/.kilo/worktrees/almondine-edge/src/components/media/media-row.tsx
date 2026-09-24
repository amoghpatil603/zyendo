import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { MediaItem } from "@/types/media-item";
import { MediaCarousel } from "./media-carousel";

export function MediaRow({
  title,
  subtitle,
  items,
  href,
}: {
  title: string;
  subtitle?: string;
  items: MediaItem[];
  href?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
      <MediaCarousel items={items} />
    </section>
  );
}
