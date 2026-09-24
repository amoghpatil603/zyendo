import { Suspense } from "react";
import { getAiDashboardData } from "@/lib/admin/ai-management";
import { AiDashboardClient } from "./ai-dashboard-client";
import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

function AiSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
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
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl border border-border/60 p-6">
            <Skeleton className="mb-4 h-5 w-32" />
            {Array.from({ length: 4 }).map((_, j) => <Skeleton key={j} className="mb-2 h-4 w-full" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminAiPage() {
  return (
    <PageContainer className="!max-w-none !px-0 !py-0">
      <Suspense fallback={<AiSkeleton />}>
        <AiPageContent />
      </Suspense>
    </PageContainer>
  );
}

async function AiPageContent() {
  const data = await getAiDashboardData();
  return <AiDashboardClient data={data} />;
}
