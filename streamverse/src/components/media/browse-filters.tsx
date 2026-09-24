import Link from "next/link";

import type { GenreOption } from "@/lib/adapters/tmdb";
import { cn } from "@/lib/utils";

export interface CategoryOption {
  value: string;
  label: string;
}

function buildHref(
  basePath: string,
  params: { category?: string; genre?: number },
): string {
  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  if (params.genre) search.set("genre", String(params.genre));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function Pill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition",
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function BrowseFilters({
  basePath,
  categories,
  activeCategory,
  genres,
  activeGenre,
}: {
  basePath: string;
  categories: CategoryOption[];
  activeCategory: string;
  genres: GenreOption[];
  activeGenre?: number;
}) {
  const genreActive = typeof activeGenre === "number";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Pill
            key={c.value}
            href={buildHref(basePath, { category: c.value })}
            active={!genreActive && activeCategory === c.value}
          >
            {c.label}
          </Pill>
        ))}
      </div>

      {genres.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Pill href={buildHref(basePath, {})} active={!genreActive}>
            All genres
          </Pill>
          {genres.map((g) => (
            <Pill
              key={g.id}
              href={buildHref(basePath, { genre: g.id })}
              active={activeGenre === g.id}
            >
              {g.name}
            </Pill>
          ))}
        </div>
      ) : null}
    </div>
  );
}
