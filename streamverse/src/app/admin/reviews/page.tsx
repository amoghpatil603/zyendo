import { Suspense } from "react";
import { getAdminReviewStats } from "@/lib/admin/review-moderation";
import { AdminReviewsClient } from "./admin-reviews-client";
import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl border border-border/60 p-5">
          <Skeleton className="mb-3 size-8 rounded-lg" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="mt-1 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <PageContainer className="!max-w-none !px-0 !py-0">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Review Moderation</h1>
          <p className="text-sm text-muted-foreground">Manage review queue, reported reviews, and community moderation.</p>
        </div>

        <Suspense fallback={<StatsSkeleton />}>
          <StatsSection />
        </Suspense>

        <Suspense fallback={<div className="glass rounded-2xl border border-border/60 p-8 text-center text-sm text-muted-foreground">Loading reviews...</div>}>
          <AdminReviewsClient />
        </Suspense>
      </div>
    </PageContainer>
  );
}

async function StatsSection() {
  const stats = await getAdminReviewStats();

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Total Reviews" value={stats.totalReviews} />
      <StatCard label="Reviews Today" value={stats.reviewsToday} />
      <StatCard label="Reported" value={stats.reportedReviews} />
      <StatCard label="Hidden" value={stats.hiddenReviews} />
      <StatCard label="Avg Rating" value={stats.averageRating} />
      <StatCard label="Pending Reports" value={stats.pendingReports} />
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
