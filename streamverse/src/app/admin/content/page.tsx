import { Suspense } from "react";
import { getCmsStats, getHeroBanners, getFeaturedContent, getEditorialCollections, getHomepageSections } from "@/lib/admin/content-management";
import { CmsClient } from "./cms-client";
import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

function CmsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64" /></div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl border border-border/60 p-5">
            <Skeleton className="mb-3 size-6 rounded-lg" /><Skeleton className="h-7 w-12" /><Skeleton className="mt-1 h-3 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function AdminContentPage() {
  return (
    <PageContainer className="!max-w-none !px-0 !py-0">
      <Suspense fallback={<CmsSkeleton />}>
        <CmsPageContent />
      </Suspense>
    </PageContainer>
  );
}

async function CmsPageContent() {
  const [stats, banners, featured, editorialCollections, sections] = await Promise.all([
    getCmsStats(), getHeroBanners(), getFeaturedContent(), getEditorialCollections(), getHomepageSections(),
  ]);
  return <CmsClient stats={stats} initialBanners={banners} initialFeatured={featured} initialEditorial={editorialCollections} initialSections={sections} />;
}
