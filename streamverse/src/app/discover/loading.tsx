import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/common/page-container";

export default function DiscoverLoading() {
  return (
    <PageContainer className="space-y-10 pb-16">
      <div className="space-y-1">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Daily Discovery */}
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" />
          ))}
        </div>
      </div>

      {/* For You */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="aspect-[2/3] w-36 shrink-0 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Trending */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-64 rounded-lg" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] w-36 shrink-0 rounded-xl sm:w-44" />
          ))}
        </div>
      </div>

      {/* Smart Search */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </PageContainer>
  );
}
