import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";
import { getCollectionWithItems, hydrateCollectionItems } from "@/lib/collections";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { CollectionForm } from "@/components/collections/collection-form";
import { DeleteCollectionButton } from "@/components/collections/delete-collection-button";
import { CollectionActions } from "@/components/collections/collection-actions";
import { MediaGrid } from "@/components/media/media-grid";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getCollectionWithItems(id);
  if (!data) return { title: "Collection" };
  return {
    title: data.collection.name,
    description: data.collection.description ?? "Custom collection",
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <Header title="Collection" />
        <p className="text-sm text-muted-foreground">Supabase is not configured.</p>
      </PageContainer>
    );
  }

  const [user, data] = await Promise.all([
    getCurrentUser(),
    getCollectionWithItems(id),
  ]);

  if (!data) notFound();

  const isOwner = Boolean(user && user.id === data.collection.userId);
  const hydratedItems = await hydrateCollectionItems(data.items);

  return (
    <PageContainer className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <Header
          title={data.collection.name}
          description={data.collection.description ?? undefined}
          count={data.collection.itemCount}
        />
        <div className="flex flex-wrap items-center gap-2">
          {isOwner && (
            <>
              <CollectionForm collection={data.collection} />
              <DeleteCollectionButton collectionId={id} />
            </>
          )}
          <CollectionActions 
            collectionId={id} 
            isOwner={isOwner} 
            isPublic={data.collection.isPublic} 
            likeCount={0} 
            initialLiked={false} 
          />
        </div>
      </div>

      {hydratedItems.length > 0 ? (
        <MediaGrid items={hydratedItems} />
      ) : (
        <p className="text-sm text-muted-foreground">This collection is empty.</p>
      )}
    </PageContainer>
  );
}

function Header({
  title,
  description,
  count,
}: {
  title: string;
  description?: string;
  count?: number;
}) {
  return (
    <header className="min-w-0 space-y-1">
      <h1 className="break-words text-2xl font-bold sm:text-3xl">{title}</h1>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {count !== undefined && (
        <p className="text-sm text-muted-foreground">
          {count} {count === 1 ? "title" : "titles"}
        </p>
      )}
    </header>
  );
}