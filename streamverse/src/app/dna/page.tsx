import Link from "next/link";
import { Dna, LogIn, Bookmark } from "lucide-react";
import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DnaGenreChart } from "@/components/dna/dna-genre-chart";
import { DnaPeopleList } from "@/components/dna/dna-people-list";
import { DnaMoodTags } from "@/components/dna/dna-mood-tags";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyDna } from "@/app/actions/dna";
import { RecomputeDnaButton } from "./recompute-button";
import { DnaVisibilityToggle } from "./visibility-toggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entertainment DNA",
  description:
    "Your personalised taste profile — built from what you watch and love.",
};

function formatRuntimeLabel(range: [number, number] | null): string | null {
  if (!range) return null;
  const [min, max] = range;
  const hMin = Math.floor(min / 60);
  const mMin = min % 60;
  const hMax = Math.floor(max / 60);
  const mMax = max % 60;
  const fmt = (h: number, m: number) =>
    h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
  return `${fmt(hMin, mMin)} – ${fmt(hMax, mMax)}`;
}

export default async function DnaPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <Header />
        <ConfigNotice
          service="Supabase"
          detail="Add Supabase credentials to enable your Entertainment DNA profile."
        />
      </PageContainer>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageContainer className="space-y-6">
        <Header />
        <EmptyState
          icon={LogIn}
          title="Sign in to see your DNA"
          description="Your Entertainment DNA is a living taste profile built from your watchlist. Sign in to discover yours."
          action={
            <Button asChild>
              <Link href="/login?next=/dna">Sign in</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const dna = await getMyDna();

  if (!dna || dna.genreWeights.length === 0) {
    return (
      <PageContainer className="space-y-6">
        <Header />
        <EmptyState
          icon={Bookmark}
          title="Your DNA isn't ready yet"
          description="Your Entertainment DNA analyzes genres, cast, and directors across your Watchlist to build a living profile of your unique tastes. Add more movies and shows, then recompute."
          action={
            <div className="flex gap-3">
              <RecomputeDnaButton />
              <Button asChild variant="secondary">
                <Link href="/movies">Browse movies</Link>
              </Button>
            </div>
          }
        />
      </PageContainer>
    );
  }

  const runtimeLabel = formatRuntimeLabel(dna.preferredRuntimeRange);

  return (
    <PageContainer className="space-y-8">
      <Header withActions>
        <RecomputeDnaButton />
        <DnaVisibilityToggle isPublic={dna.isPublic} />
      </Header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Left column — Genre weights */}
        <section className="glass min-w-0 space-y-4 rounded-2xl p-6">
          <h2 className="text-lg font-semibold">Genre Affinity</h2>
          <DnaGenreChart genreWeights={dna.genreWeights} />
        </section>

        {/* Right column — Meta info */}
        <aside className="space-y-6">
          <section className="glass space-y-3 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Profile Info
            </h2>
            <div className="space-y-2 text-sm">
              {dna.preferredLanguages.length > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Languages</span>
                  <span className="font-medium">
                    {dna.preferredLanguages.join(", ").toUpperCase()}
                  </span>
                </div>
              ) : null}
              {runtimeLabel ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sweet spot</span>
                  <span className="font-medium">{runtimeLabel}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Genres tracked</span>
                <span className="font-medium">{dna.genreWeights.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last updated</span>
                <span className="font-medium">
                  {new Date(dna.lastComputedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </section>

          <DnaMoodTags moodTags={dna.moodTags} />
        </aside>
      </div>

      {dna.topActors.length > 0 || dna.topDirectors.length > 0 ? (
        <div className="glass space-y-6 rounded-2xl p-6">
          <DnaPeopleList people={dna.topActors} title="Top Actors" />
          <Separator />
          <DnaPeopleList people={dna.topDirectors} title="Top Directors" />
        </div>
      ) : null}
    </PageContainer>
  );
}

function Header({
  children,
  withActions,
}: {
  children?: React.ReactNode;
  withActions?: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Dna className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Entertainment DNA</h1>
          <p className="text-sm text-muted-foreground">
            Your living taste profile
          </p>
        </div>
      </div>
      {withActions ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </header>
  );
}