import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageContainer className="space-y-8">
      <header className="mx-auto max-w-2xl space-y-4 text-center">
        <Skeleton className="mx-auto size-12 rounded-full" />
        <Skeleton className="mx-auto h-8 w-64" />
        <Skeleton className="mx-auto h-4 w-96" />
      </header>
      <div className="mx-auto max-w-md">
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </PageContainer>
  );
}
