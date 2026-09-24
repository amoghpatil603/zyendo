import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/social/social-actions";
import { PublicProfileClient } from "./public-profile-client";
import { PageContainer } from "@/components/common/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="glass rounded-2xl border border-border/60 p-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Skeleton className="size-24 rounded-full" />
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
      {/* Tabs */}
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) notFound();

  return (
    <PageContainer className="space-y-8 pb-16">
      <Suspense fallback={<ProfileSkeleton />}>
        <PublicProfileClient initialProfile={profile} userId={id} />
      </Suspense>
    </PageContainer>
  );
}
