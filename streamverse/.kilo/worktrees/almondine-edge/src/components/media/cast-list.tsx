import Image from "next/image";
import { UserRound } from "lucide-react";

import type { MediaPerson } from "@/types/media-item";

export function CastList({ people }: { people: MediaPerson[] }) {
  if (people.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold sm:text-xl">Cast &amp; Crew</h2>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {people.map((person, i) => (
          <figure
            key={`${person.externalId ?? person.name}-${i}`}
            className="w-24 shrink-0 text-center"
          >
            <div className="relative mx-auto size-20 overflow-hidden rounded-full border border-border/60 bg-muted">
              {person.imageUrl ? (
                <Image
                  src={person.imageUrl}
                  alt={person.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <UserRound className="size-8" />
                </div>
              )}
            </div>
            <figcaption className="mt-2">
              <p className="line-clamp-1 text-xs font-medium">{person.name}</p>
              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                {person.role}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
