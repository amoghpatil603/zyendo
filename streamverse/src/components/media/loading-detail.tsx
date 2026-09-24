import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingDetail() {
  return (
    <div>
      <div className="relative">
        <Skeleton className="h-[38vh] min-h-64 w-full sm:h-[46vh] rounded-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>
      <PageContainer className="relative -mt-40 sm:-mt-48 space-y-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <Skeleton className="aspect-[2/3] w-32 shrink-0 rounded-xl sm:w-48" />
          <div className="flex-1 min-w-0 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 sm:h-12 lg:h-16 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-10 w-28 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      </PageContainer>
    </div>
  );
}
