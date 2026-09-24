"use client";

import {
  Bot, MessageSquare, Users, Clock, Cpu, DollarSign,
  AlertTriangle, CheckCircle, TrendingUp, ThumbsUp, ThumbsDown,
  BarChart3, Activity, Zap, Shield, Settings, Sparkles,
  Brain, Search, Film,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AiDashboardData } from "@/lib/admin/ai-management";

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ icon: Icon, label, value, suffix, subtitle }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; suffix?: string; subtitle?: string;
}) {
  return (
    <div className="glass rounded-2xl border border-border/60 p-5 transition hover:border-primary/30">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-5" />
      </div>
      <p className="text-2xl font-bold">
        {typeof value === "number" ? value.toLocaleString() : value}
        {suffix && <span className="text-sm font-normal text-muted-foreground"> {suffix}</span>}
      </p>
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
// Horizontal bar with label and value
// ---------------------------------------------------------------------------

function HorizontalBar({ label, value, max, color = "var(--primary)" }: {
  label: string; value: number; max: number; color?: string;
}) {
  const pct = Math.max(2, max > 0 ? (value / max) * 100 : 0);
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 truncate text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 rounded-full bg-muted h-4 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 text-right text-xs font-medium">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider status card
// ---------------------------------------------------------------------------

function ProviderCard({ name, online, responseTime, errorRate }: {
  name: string; online: boolean; responseTime: string; errorRate: number;
}) {
  return (
    <div className="glass rounded-2xl border border-border/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
          online ? "bg-green-500/15 text-green-500" : "bg-red-500/15 text-red-500")}>
          <span className={cn("size-1.5 rounded-full", online ? "bg-green-500" : "bg-red-500")} />
          {online ? "Online" : "Offline"}
        </span>
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between"><span>Response</span><span>{responseTime}</span></div>
        <div className="flex justify-between"><span>Error rate</span><span>{errorRate}%</span></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AI Dashboard Client
// ---------------------------------------------------------------------------

export function AiDashboardClient({ data }: { data: AiDashboardData }) {
  const { overview, providers, recommendations, performance, config, recentErrors, featureUsage } = data;
  const maxFeature = Math.max(...Object.values(featureUsage), 1);

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <Bot className="size-6 text-primary" />
          AI Management
        </h1>
        <p className="text-sm text-muted-foreground">
          AI usage analytics, provider monitoring, and performance metrics
        </p>
      </div>

      {/* Section 1: AI Overview */}
      <section>
        <SectionHeader icon={BarChart3} title="AI Overview" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={MessageSquare} label="AI Conversations" value={overview.totalConversations} />
          <StatCard icon={TrendingUp} label="Recommendations Generated" value={overview.recommendationsGenerated} />
          <StatCard icon={Users} label="Active AI Users" value={overview.activeAiUsers} />
          <StatCard icon={Clock} label="Avg Response Time" value={overview.averageResponseTime} suffix="s" />
          <StatCard icon={Cpu} label="Avg Tokens/Request" value={overview.averageTokensPerRequest} />
          <StatCard icon={DollarSign} label="Est. Cost" value={`$${overview.estimatedCost.toFixed(3)}`} />
          <StatCard icon={AlertTriangle} label="Failed Requests" value={overview.failedRequests} />
          <StatCard icon={CheckCircle} label="Success Rate" value={overview.successRate} suffix="%" />
        </div>
      </section>

      {/* Section 2: Provider Status */}
      <section>
        <SectionHeader icon={Shield} title="AI Provider Status" subtitle="Current health and performance of integrated services" />
        <div className="grid gap-4 md:grid-cols-3">
          {providers.map((p) => (
            <ProviderCard key={p.name} name={p.name} online={p.online} responseTime={p.responseTime} errorRate={p.errorRate} />
          ))}
        </div>
      </section>

      {/* Section 3: Recommendation Analytics */}
      <section>
        <SectionHeader icon={ThumbsUp} title="Recommendation Analytics" subtitle="How users are engaging with AI recommendations" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-2xl border border-border/60 p-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{recommendations.accepted}</p>
                <p className="text-xs text-muted-foreground">Accepted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{recommendations.dismissed}</p>
                <p className="text-xs text-muted-foreground">Dismissed</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <div className="flex-1 rounded-full bg-muted h-4 overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${recommendations.ctr}%` }} />
              </div>
              <span className="text-sm font-bold">{recommendations.ctr}% CTR</span>
            </div>
          </div>
          <div className="glass rounded-2xl border border-border/60 p-6">
            <p className="mb-4 text-sm font-semibold">Top Recommendation Sources</p>
            {recommendations.topCategories.length > 0 ? (
              <div className="space-y-2">
                {recommendations.topCategories.map((c, i) => (
                  <HorizontalBar key={i} label={c.category} value={c.count} max={recommendations.topCategories[0]?.count ?? 1} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Section 4: Feature Usage */}
      <section>
        <SectionHeader icon={Activity} title="Feature Usage" subtitle="How users are interacting with AI features" />
        <div className="glass rounded-2xl border border-border/60 p-6">
          <div className="space-y-3">
            <HorizontalBar label="AI Picks" value={featureUsage.aiPicks} max={maxFeature} color="var(--primary)" />
            <HorizontalBar label="AI Assistant" value={featureUsage.aiAssistant} max={maxFeature} color="var(--accent)" />
            <HorizontalBar label="Entertainment DNA" value={featureUsage.entertainmentDna} max={maxFeature} color="var(--chart-2)" />
            <HorizontalBar label="Mood Recommendations" value={featureUsage.moodRecommendations} max={maxFeature} color="var(--chart-3)" />
            <HorizontalBar label="Watch Planner" value={featureUsage.watchPlanner} max={maxFeature} color="var(--chart-4)" />
            <HorizontalBar label="Ending Explainer" value={featureUsage.endingExplainer} max={maxFeature} color="var(--chart-5)" />
          </div>
        </div>
      </section>

      {/* Section 5: Performance */}
      <section>
        <SectionHeader icon={Zap} title="Performance" subtitle="Latency and throughput metrics" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Clock} label="Avg Latency" value={performance.averageLatency} suffix="s" subtitle="Average response" />
          <StatCard icon={Activity} label="P95 Latency" value={performance.p95Latency} suffix="s" subtitle="95th percentile" />
          <StatCard icon={Cpu} label="Cache Hit Rate" value={performance.cacheHitRate} suffix="%" />
          <StatCard icon={Zap} label="DB Latency" value={performance.databaseLatency} suffix="s" />
          <StatCard icon={Film} label="TMDB Latency" value={performance.tmdbLatency} suffix="s" />
          <StatCard icon={Bot} label="Groq Latency" value={performance.groqLatency} suffix="s" />
        </div>
      </section>

      {/* Section 6: Model Configuration */}
      <section>
        <SectionHeader icon={Settings} title="Model Configuration" subtitle="Current AI provider settings (read-only)" />
        <div className="glass rounded-2xl border border-border/60 p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Provider</p>
              <p className="font-medium">{config.provider}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Model</p>
              <p className="font-medium text-sm break-all">{config.model}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Temperature</p>
              <p className="font-medium">{config.temperature}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Max Tokens</p>
              <p className="font-medium">{config.maxTokens.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Streaming</p>
              <p className={cn("font-medium", config.streamingEnabled ? "text-green-500" : "text-muted-foreground")}>
                {config.streamingEnabled ? "Enabled" : "Disabled"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Rate Limits</p>
              <p className="font-medium">{config.rateLimits}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Error Monitoring */}
      <section>
        <SectionHeader icon={AlertTriangle} title="Error Monitoring" subtitle="Recent AI-related errors and failures" />
        <div className="glass rounded-2xl border border-border/60 overflow-hidden">
          {recentErrors.length > 0 ? (
            <div className="divide-y divide-border/60">
              {recentErrors.slice(0, 5).map((err) => (
                <div key={err.id} className="flex items-center gap-4 p-4">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-red-500/15 text-red-500">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{err.errorType}</p>
                    <p className="text-xs text-muted-foreground">{err.provider} · {new Date(err.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium",
                    err.resolved ? "bg-green-500/15 text-green-500" : "bg-yellow-500/15 text-yellow-500")}>
                    {err.resolved ? "Resolved" : "Open"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <CheckCircle className="mx-auto mb-2 size-8 text-green-500" />
              <p className="text-sm text-muted-foreground">No recent errors. All systems operational.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
