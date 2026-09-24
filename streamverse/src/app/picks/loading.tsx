import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/common/page-container";

export default function PicksLoading() {
  return (
    <PageContainer className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-4 w-64" />
      </header>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card/50 p-4">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <Skeleton className="mt-2 h-16 w-full" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
