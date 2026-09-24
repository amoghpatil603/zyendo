"use client";

import Image from "next/image";
import { UserRound } from "lucide-react";
import type { DnaPerson } from "@/types/dna";

export function DnaPeopleList({
  people,
  title,
}: {
  people: DnaPerson[];
  title: string;
}) {
  if (people.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="flex flex-wrap gap-3">
        {people.slice(0, 10).map((person) => (
          <div
            key={person.externalId}
            className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-sm"
          >
            <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-muted">
              {person.imageUrl ? (
                <Image
                  src={person.imageUrl}
                  alt={person.name}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <UserRound className="size-4" />
                </div>
              )}
            </div>
            <div>
              <p className="font-medium">{person.name}</p>
              <p className="text-xs text-muted-foreground">
                {person.count} title{person.count !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}