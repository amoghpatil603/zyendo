import Link from "next/link";
import { Suspense } from "react";
import {
  Users, UserPlus, MessageSquare, FolderOpen, Bot,
  ListMusic, TrendingUp, Eye, BarChart3, Settings,
  Shield, Bell,
} from "lucide-react";

import { getAdminDashboardStats, getAdminRecentActivity } from "@/lib/admin/admin-data";
import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminDashboardStats, AdminRecentActivity } from "@/types/admin";

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl border border-border/60 p-5">
            <Skeleton className="mb-3 size-8 rounded-lg" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="mt-1 h-3 w-24" />
          </div>
        ))}
      </div>
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
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div className="glass rounded-2xl border border-border/60 p-5 transition hover:border-primary/30">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-5" />
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

function ActivityFeed({ activities }: { activities: AdminRecentActivity[] }) {
  if (activities.length === 0) {
    return (
      <div className="glass rounded-2xl border border-border/60 p-6 text-center text-sm text-muted-foreground">
        No recent activity yet.
      </div>
    );
  }

  const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    user_joined: UserPlus,
    review_created: MessageSquare,
    collection_created: FolderOpen,
    content_reported: Shield,
    ai_conversation: Bot,
    system_event: Settings,
  };

  return (
    <div className="glass rounded-2xl border border-border/60 divide-y divide-border/60">
      {activities.map((activity) => {
        const Icon = typeIcons[activity.type] ?? Eye;
        return (
          <div key={activity.id} className="flex items-start gap-4 p-4">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">{activity.description}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

const QUICK_ACTIONS = [
  { label: "Feature Content", href: "/admin/content", icon: TrendingUp, description: "Manage featured movies & shows" },
  { label: "Manage Users", href: "/admin/users", icon: Users, description: "View, suspend, or ban users" },
  { label: "Moderate Reviews", href: "/admin/reviews", icon: MessageSquare, description: "Review queue & reports" },
  { label: "View Analytics", href: "/admin/analytics", icon: BarChart3, description: "Platform performance metrics" },
  { label: "AI Dashboard", href: "/admin/ai", icon: Bot, description: "AI usage & performance" },
  { label: "Settings", href: "/admin/settings", icon: Settings, description: "Platform configuration" },
];

function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.label}
            href={action.href}
            className="glass rounded-2xl border border-border/60 p-4 text-center transition hover:border-primary/40 hover:-translate-y-0.5"
          >
            <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <p className="text-sm font-medium">{action.label}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{action.description}</p>
          </Link>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard content (fetcher)
// ---------------------------------------------------------------------------

async function DashboardContent() {
  const [stats, activities] = await Promise.all([
    getAdminDashboardStats(),
    getAdminRecentActivity(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platform overview and statistics
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} href="/admin/users" />
        <StatCard icon={UserPlus} label="Active Users" value={stats.activeUsers} href="/admin/users" />
        <StatCard icon={TrendingUp} label="New Today" value={stats.newUsersToday} href="/admin/users" />
        <StatCard icon={MessageSquare} label="Reviews" value={stats.totalReviews} href="/admin/reviews" />
        <StatCard icon={FolderOpen} label="Collections" value={stats.collectionsCreated} href="/admin/collections" />
        <StatCard icon={ListMusic} label="Watch Queue" value={stats.watchQueueItems} />
        <StatCard icon={Bot} label="AI Conversations" value={stats.aiConversations} href="/admin/ai" />
        <StatCard icon={Eye} label="Daily Active" value={stats.dailyActiveUsers} href="/admin/analytics" />
      </div>

      {/* Quick actions */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <QuickActions />
      </section>

      {/* Recent activity + sidebar */}
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
          <ActivityFeed activities={activities} />
        </section>

        <aside className="space-y-6">
          {/* Platform health */}
          <div className="glass rounded-2xl border border-border/60 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Shield className="size-4 text-primary" />
              Platform Status
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Database</span>
                <span className="flex items-center gap-1 text-green-500">
                  <span className="size-2 rounded-full bg-green-500" />
                  Healthy
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">AI Service</span>
                <span className="flex items-center gap-1 text-green-500">
                  <span className="size-2 rounded-full bg-green-500" />
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Auth</span>
                <span className="flex items-center gap-1 text-green-500">
                  <span className="size-2 rounded-full bg-green-500" />
                  Operational
                </span>
              </div>
            </div>
          </div>

          {/* Quick link */}
          <div className="glass rounded-2xl border border-border/60 p-5 text-center">
            <Bell className="mx-auto mb-2 size-6 text-primary" />
            <p className="text-sm font-medium">Broadcast Notification</p>
            <p className="mt-1 text-xs text-muted-foreground">Coming soon</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

export default function AdminDashboardPage() {
  return (
    <PageContainer className="!max-w-none !px-0 !py-0">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </PageContainer>
  );
}
