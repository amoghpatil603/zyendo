import { Suspense } from "react";
import { getAdminUserStats } from "@/lib/admin/user-management";
import { AdminUsersClient } from "./admin-users-client";
import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl border border-border/60 p-5">
          <Skeleton className="mb-3 size-8 rounded-lg" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="mt-1 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function UserTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-border/60 glass p-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <PageContainer className="!max-w-none !px-0 !py-0">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">View, search, manage, and moderate users.</p>
        </div>

        <Suspense fallback={<StatsSkeleton />}>
          <StatsSection />
        </Suspense>

        <Suspense fallback={<UserTableSkeleton />}>
          <AdminUsersClient />
        </Suspense>
      </div>
    </PageContainer>
  );
}

async function StatsSection() {
  const stats = await getAdminUserStats();

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
      <StatCard label="Total Users" value={stats.totalUsers} />
      <StatCard label="Active Users" value={stats.activeUsers} />
      <StatCard label="New Today" value={stats.newUsersToday} />
      <StatCard label="New This Week" value={stats.newUsersThisWeek} />
      <StatCard label="Admins" value={stats.adminCount} />
      <StatCard label="Moderators" value={stats.moderatorCount} />
      <StatCard label="Suspended" value={stats.suspendedUsers} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-2xl border border-border/60 p-4">
      <p className="text-lg font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
