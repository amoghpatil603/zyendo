import { PageContainer } from "@/components/common/page-container";
import { LoadingGrid } from "@/components/common/loading-grid";

export default function CollectionDetailLoading() {
  return (
    <div>
      <div className="relative h-[30vh] min-h-48 w-full sm:h-[35vh]">
        <div className="h-full w-full animate-pulse bg-muted" />
      </div>

      <PageContainer className="relative -mt-32 space-y-10 sm:-mt-40">
        <div className="flex gap-6">
          <div className="aspect-[16/9] w-48 shrink-0 animate-pulse rounded-xl bg-muted sm:w-64" />
          <div className="flex-1 space-y-3 pt-10">
             <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
             <div className="h-4 w-64 animate-pulse rounded-md bg-muted" />
          </div>
        </div>

        <LoadingGrid count={12} />
      </PageContainer>
    </div>
  );
}
