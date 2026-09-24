import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "./page-container";

export function LoadingGrid({ count = 12 }: { count?: number }) {
  return (
    <PageContainer className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-full rounded-xl" />
        ))}
      </div>
    </PageContainer>
  );
}
