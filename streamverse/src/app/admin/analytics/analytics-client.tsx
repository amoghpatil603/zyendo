"use client";

import { useState } from "react";
import {
  BarChart3, Users, UserCheck, MessageSquare, FolderOpen,
  ListMusic, Bot, Eye, TrendingUp, Activity, Star, Dna,
  Search, Clock, Zap, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalyticsData } from "@/lib/admin/analytics-data";

// ---------------------------------------------------------------------------
// Simple inline bar chart (pure CSS, no dependencies)
// ---------------------------------------------------------------------------

function BarChart({
  data,
  color = "var(--primary)",
  maxHeight = 120,
  showLabels = true,
  labelKey,
  valueKey,
}: {
  data: { label?: string; [key: string]: unknown }[];
  color?: string;
  maxHeight?: number;
  showLabels?: boolean;
  labelKey: string;
  valueKey: string;
}) {
  const values = data.map((d) => Number(d[valueKey]) || 0);
  const max = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height: maxHeight }}>
      {data.map((d, i) => {
        const v = Number(d[valueKey]) || 0;
        const h = Math.max(3, (v / max) * (maxHeight - 20));
        return (
          <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
              style={{ height: h, backgroundColor: color, minHeight: 3 }}
              title={`${d[labelKey as string] ?? ""}: ${v}`}
            />
            {showLabels && (
              <span className="mt-1 truncate text-[9px] text-muted-foreground" style={{ maxWidth: "100%" }}>
                {typeof d[labelKey] === "string" && (d[labelKey] as string).length > 5
                  ? (d[labelKey] as string).slice(0, 5)
                  : String(d[labelKey] ?? "")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="glass rounded-2xl border border-border/60 p-5 transition hover:border-primary/30">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-5" />
      </div>
      <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {subtitle && <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Icon className="size-5 text-primary" />
        {title}
      </h2>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal bar (for ranked lists)
// ---------------------------------------------------------------------------

function HorizontalBar({ label, value, max, color = "var(--primary)" }: {
  label: string; value: number; max: number; color?: string;
}) {
  const pct = Math.max(2, (value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 truncate text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 rounded-full bg-muted h-4 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 text-right text-xs font-medium">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Analytics Client
// ---------------------------------------------------------------------------

export function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const [timeRange, _setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const { overview, dailySignups, weeklyGrowth, topGenres, mostReviewedMovies,
    mostReviewedTv, reviewRatingDistribution, systemHealth, dnaTopGenres,
    mostActiveUsers } = data;

  const maxReviews = Math.max(...mostReviewedMovies.map((m) => m.count), 1);
  const maxTvReviews = Math.max(...mostReviewedTv.map((t) => t.count), 1);

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Platform Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Platform performance, engagement, and growth metrics
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border/60 p-0.5">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition",
                timeRange === r ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => _setTimeRange(r)}
            >
              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: Platform Overview */}
      <section>
        <SectionHeader icon={BarChart3} title="Platform Overview" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Users} label="Total Users" value={overview.totalUsers} />
          <StatCard icon={UserCheck} label="Daily Active" value={overview.dailyActiveUsers} subtitle="~15% of total" />
          <StatCard icon={TrendingUp} label="Monthly Active" value={overview.monthlyActiveUsers} subtitle="~45% of total" />
          <StatCard icon={MessageSquare} label="Total Reviews" value={overview.totalReviews} />
          <StatCard icon={FolderOpen} label="Collections" value={overview.totalCollections} />
          <StatCard icon={ListMusic} label="Watch Queue" value={overview.totalWatchQueueItems} />
          <StatCard icon={Bot} label="AI Conversations" value={overview.totalAiConversations} />
          <StatCard icon={Eye} label="Watch Together" value={overview.watchTogetherSessions} />
        </div>
      </section>

      {/* Section 2: Growth */}
      <section>
        <SectionHeader icon={TrendingUp} title="Growth" subtitle="Daily signups and weekly activity" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-2xl border border-border/60 p-6">
            <p className="mb-4 text-sm font-semibold">Daily New Users</p>
            {dailySignups.length > 0 ? (
              <BarChart data={dailySignups.map((d) => ({ ...d, label: d.date.slice(5) }))} labelKey="label" valueKey="count" maxHeight={100} />
            ) : (
              <p className="text-sm text-muted-foreground">No data available.</p>
            )}
          </div>
          <div className="glass rounded-2xl border border-border/60 p-6">
            <p className="mb-4 text-sm font-semibold">Weekly Growth (Signups vs Activity)</p>
            <div className="space-y-3">
              {weeklyGrowth.length > 0 ? (
                weeklyGrowth.map((w, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-muted-foreground">{w.week}</span>
                    <div className="flex flex-1 gap-1">
                      <div className="flex-1 rounded-full bg-muted h-3 overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (w.signups / Math.max(...weeklyGrowth.map((x) => x.signups), 1)) * 100)}%` }} />
                      </div>
                      <div className="flex-1 rounded-full bg-muted h-3 overflow-hidden">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, (w.active / Math.max(...weeklyGrowth.map((x) => x.active), 1)) * 100)}%` }} />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground w-16 text-right">{w.signups}/{w.active}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No data available.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: User Activity */}
      <section>
        <SectionHeader icon={Activity} title="User Activity" subtitle="Most active users on the platform" />
        <div className="glass rounded-2xl border border-border/60 p-6">
          {mostActiveUsers.length > 0 ? (
            <div className="space-y-2">
              {mostActiveUsers.map((u, i) => (
                <HorizontalBar key={i} label={u.name} value={u.actions} max={mostActiveUsers[0]?.actions ?? 1} color={i < 3 ? "var(--primary)" : "var(--accent)"} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No activity data yet.</p>
          )}
        </div>
      </section>

      {/* Section 4: Content Analytics */}
      <section>
        <SectionHeader icon={Zap} title="Content Analytics" subtitle="Most reviewed movies and TV shows" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-2xl border border-border/60 p-6">
            <p className="mb-4 text-sm font-semibold">Most Reviewed Movies</p>
            {mostReviewedMovies.length > 0 ? (
              <div className="space-y-2">
                {mostReviewedMovies.map((m, i) => (
                  <HorizontalBar key={i} label={m.title} value={m.count} max={maxReviews} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </div>
          <div className="glass rounded-2xl border border-border/60 p-6">
            <p className="mb-4 text-sm font-semibold">Most Reviewed TV Shows</p>
            {mostReviewedTv.length > 0 ? (
              <div className="space-y-2">
                {mostReviewedTv.map((t, i) => (
                  <HorizontalBar key={i} label={t.title} value={t.count} max={maxTvReviews} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Section 5: Review Analytics */}
      <section>
        <SectionHeader icon={Star} title="Review Analytics" subtitle="Rating distribution across all reviews" />
        <div className="glass rounded-2xl border border-border/60 p-6">
          {reviewRatingDistribution.length > 0 ? (
            <BarChart
              data={reviewRatingDistribution.map((r) => ({ label: `${r.rating}`, count: r.count }))}
              labelKey="label" valueKey="count" maxHeight={140}
              color="var(--accent)"
            />
          ) : (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          )}
        </div>
      </section>

      {/* Section 6: Collection Analytics */}
      <section>
        <SectionHeader icon={FolderOpen} title="Collection Analytics" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={FolderOpen} label="Total Collections" value={overview.totalCollections} />
          <StatCard icon={FolderOpen} label="Avg Items/Collection" value={overview.totalWatchQueueItems > 0 && overview.totalCollections > 0
            ? Math.round(overview.totalWatchQueueItems / overview.totalCollections) : 0} />
          <StatCard icon={FolderOpen} label="Featured" value="—" />
          <StatCard icon={FolderOpen} label="Public" value="—" />
        </div>
      </section>

      {/* Section 7: Entertainment DNA */}
      <section>
        <SectionHeader icon={Dna} title="Entertainment DNA" subtitle="Top genres across all user DNA profiles" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-2xl border border-border/60 p-6">
            <p className="mb-4 text-sm font-semibold">Genre Distribution</p>
            {topGenres.length > 0 ? (
              <div className="space-y-2">
                {topGenres.map((g, i) => (
                  <HorizontalBar key={i} label={g.name} value={g.count} max={topGenres[0]?.count ?? 1} color="var(--primary)" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No DNA data yet.</p>
            )}
          </div>
          <div className="glass rounded-2xl border border-border/60 p-6">
            <p className="mb-4 text-sm font-semibold">Most Common Top Genre</p>
            {dnaTopGenres.length > 0 ? (
              <BarChart
                data={dnaTopGenres.map((d) => ({ label: d.genre.length > 8 ? d.genre.slice(0, 8) : d.genre, users: d.users }))}
                labelKey="label" valueKey="users" maxHeight={100}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No DNA data yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Section 9: System Health */}
      <section>
        <SectionHeader icon={Shield} title="System Health" subtitle="Current status of platform services" />
        <div className="grid gap-4 md:grid-cols-4">
          {systemHealth.map((s, i) => (
            <div key={i} className="glass rounded-2xl border border-border/60 p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", s.status === "healthy" ? "bg-green-500" : s.status === "degraded" ? "bg-yellow-500" : "bg-red-500")} />
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              <span className={cn("text-xs", s.status === "healthy" ? "text-green-500" : s.status === "degraded" ? "text-yellow-500" : "text-red-500")}>
                {s.detail}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
