"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Tv,
  Library,
  Star,
  Trophy,
  Flame,
  Target,
  Clock,
  TrendingUp,
  Zap,
  Award,
  Activity,
  Film,
  PlayCircle,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, CalendarDays } from "lucide-react";
import type { DashboardData } from "@/types/profile";
import type { EntertainmentDna } from "@/types/dna";
import { getMyDna } from "@/app/actions/dna";
import { getDashboardAction } from "@/app/actions/profile";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="glass rounded-2xl border border-border/60 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dna, setDna] = useState<Pick<EntertainmentDna, "genreWeights" | "moodTags"> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getDashboardAction();
    if (result.ok) {
      setData(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void getMyDna().then((d) => {
      if (d && d.genreWeights.length > 0) {
        setDna({
          genreWeights: d.genreWeights.slice(0, 5),
          moodTags: d.moodTags.slice(0, 5),
        });
      }
    });
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">Could not load dashboard data.</p>
        <Button onClick={load} className="mt-4">Retry</Button>
      </div>
    );
  }

  const stats = data.stats;
  const profile = data.profile;

  const initials =
    (profile?.displayName || "User")
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const country = profile?.settings?.language?.region || "US";
  // Fallback for age if not set
  const age = profile?.settings?.age || "N/A";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-primary/20">
            {profile?.avatarUrl ? (
              <AvatarImage src={profile.avatarUrl} alt={profile.displayName || "User"} className="object-cover" />
            ) : null}
            <AvatarFallback className="text-xl font-medium">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{profile?.displayName || "Zynora User"}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {country}
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {age === "N/A" ? "Age not set" : `${age} years old`}
              </span>
            </div>
          </div>
        </div>
        <Button asChild variant="secondary" className="gap-2 shrink-0">
          <Link href="/discover">
            <PlayCircle className="size-4" />
            Discover
          </Link>
        </Button>
      </div>

      {stats && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Movies" value={stats.totalMoviesWatched} icon={Film} />
          <StatCard label="TV Episodes" value={stats.totalTvEpisodesWatched} icon={Tv} />
          <StatCard label="Reviews" value={stats.totalReviewsWritten} icon={Star} />
          <StatCard label="Collections" value={stats.totalCollectionsCreated} icon={Library} />
          <StatCard label="Hours" value={stats.totalHoursWatched} icon={Clock} />
          <StatCard label="Streak" value={`${data.watchStreak?.currentStreak ?? 0} days`} icon={Flame} />
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="glass rounded-2xl border border-border/60 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <PlayCircle className="size-5 text-primary" />
              Continue Watching
            </h2>
            {data.continueWatching.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing in progress right now.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.continueWatching.map((entry) => (
                  <Link
                    key={`${entry.mediaType}-${entry.mediaId}`}
                    href={`/${entry.mediaType}/${entry.mediaId}`}
                    className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition hover:border-primary/30"
                  >
                    <div className="size-12 shrink-0 rounded-lg bg-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">{entry.mediaType}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="glass rounded-2xl border border-border/60 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Activity className="size-5 text-primary" />
              Activity Timeline
            </h2>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                    <div className="size-8 shrink-0 rounded-full bg-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{a.activityType.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="glass rounded-2xl border border-border/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Trophy className="size-4 text-primary" />
              Achievements
            </h2>
            {data.recentAchievements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No achievements yet.</p>
            ) : (
              <div className="space-y-2">
                {data.recentAchievements.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 rounded-xl border border-border/60 p-2.5">
                    <Award className="size-4 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.achievement?.name ?? "Achievement"}</p>
                      <p className="text-xs text-muted-foreground">{a.achievement?.description ?? ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {dna && (
            <section className="glass rounded-2xl border border-border/60 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <TrendingUp className="size-4 text-primary" />
                Entertainment DNA
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {dna.genreWeights.map((g) => (
                  <span key={g.name} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {g.name}
                  </span>
                ))}
              </div>
              {dna.moodTags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {dna.moodTags.map((m) => (
                    <span key={m.tag} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                      {m.tag}
                    </span>
                  ))}
                </div>
              )}
              <Link href="/dna" className="mt-3 block text-xs text-primary hover:underline">
                View full DNA profile →
              </Link>
            </section>
          )}

          <section className="glass rounded-2xl border border-border/60 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Settings2 className="size-4 text-primary" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/watchlist">Watchlist</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/collections">Collections</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/reviews">Reviews</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/dna">DNA Profile</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
