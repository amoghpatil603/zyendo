import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { UserRound, Film, Tv } from "lucide-react";

import { PageContainer } from "@/components/common/page-container";
import { MediaGrid } from "@/components/media/media-grid";
import { tmdbImageUrl } from "@/lib/adapters/tmdb/client";
import { getPersonDetail, getPersonCombinedCredits } from "@/lib/adapters/tmdb";

export const dynamic = "force-dynamic";

interface PersonPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PersonPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const person = await getPersonDetail(id);
    return {
      title: person.name,
      description: person.biography?.slice(0, 150) || `Details for ${person.name}`,
    };
  } catch {
    return { title: "Person Not Found" };
  }
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { id } = await params;

  let person;
  let credits;

  try {
    const [personData, creditsData] = await Promise.all([
      getPersonDetail(id),
      getPersonCombinedCredits(Number(id)),
    ]);
    person = personData;
    credits = creditsData;
  } catch (err) {
    notFound();
  }

  const profileUrl = person.profile_path ? tmdbImageUrl(person.profile_path, "w500") : null;

  return (
    <PageContainer className="space-y-10 pb-16">
      {/* Bio Section */}
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="shrink-0">
          <div className="relative aspect-[2/3] w-48 overflow-hidden rounded-xl bg-muted shadow-lg md:w-64">
            {profileUrl ? (
              <Image
                src={profileUrl}
                alt={person.name}
                fill
                sizes="(max-width: 768px) 192px, 256px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <UserRound className="size-16 text-muted-foreground/30" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">{person.name}</h1>
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {person.known_for_department && (
              <div className="rounded-full border border-border/60 bg-muted/30 px-3 py-1">
                {person.known_for_department}
              </div>
            )}
            {person.birthday && (
              <div className="rounded-full border border-border/60 bg-muted/30 px-3 py-1">
                Born: {person.birthday}
              </div>
            )}
            {person.deathday && (
              <div className="rounded-full border border-border/60 bg-muted/30 px-3 py-1">
                Died: {person.deathday}
              </div>
            )}
            {person.place_of_birth && (
              <div className="rounded-full border border-border/60 bg-muted/30 px-3 py-1">
                {person.place_of_birth}
              </div>
            )}
          </div>

          {person.biography && (
            <div className="space-y-2 pt-4">
              <h2 className="text-xl font-semibold">Biography</h2>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {person.biography}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filmography Section */}
      {credits.length > 0 && (
        <div className="space-y-6">
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Film className="size-6 text-primary" />
            Known For
          </h2>
          <MediaGrid items={credits} />
        </div>
      )}
    </PageContainer>
  );
}
