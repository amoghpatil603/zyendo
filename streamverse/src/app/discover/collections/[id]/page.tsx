import { notFound } from "next/navigation";
import { MediaGrid } from "@/components/media/media-grid";
import type { Metadata } from "next";
import { getResolvedEditorialCollection } from "@/lib/discovery/cms-resolver";
import type { MediaItem } from "@/types/media-item";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const collection = await getResolvedEditorialCollection(id);
  if (!collection) {
    return { title: "Collection Not Found" };
  }
  return {
    title: collection.title,
    description: collection.description ?? `Editorial collection: ${collection.title}`,
  };
}

export const dynamic = "force-dynamic";

export default async function EditorialCollectionPage({ params }: Props) {
  const { id } = await params;
  const collection = await getResolvedEditorialCollection(id);

  if (!collection) {
    notFound();
  }

  const items: MediaItem[] = collection.items
    .map((item) => item.media)
    .filter((item): item is MediaItem => item !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{collection.title}</h1>
        {collection.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {collection.description}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {items.length} items
        </p>
      </div>

      {items.length > 0 ? (
        <MediaGrid items={items} />
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No items in this collection.
        </p>
      )}
    </div>
  );
}