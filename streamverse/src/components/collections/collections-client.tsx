"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { getCollectionsAction, createCollectionAction, deleteCollectionAction } from "@/app/actions/collections";
import type { Collection } from "@/types/collection";
import { CollectionCard } from "./collection-card";
import dynamic from "next/dynamic";

const CreateCollectionDialog = dynamic(() => import("./create-collection-dialog").then(m => m.CreateCollectionDialog));
import { Library, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CollectionsClient() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getCollectionsAction();
    if (result.ok) {
      setCollections(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(name: string, description: string | null, isPublic: boolean) {
    const result = await createCollectionAction({ name, description, isPublic });
    if (result.ok) {
      setShowCreate(false);
      load();
    } else {
      const msg =
        result.error === "unauthenticated"
          ? "Please sign in to create a collection."
          : result.error === "unconfigured"
            ? "Supabase is not configured."
            : "Failed to create collection. Make sure you have a user profile set up.";
      toast.error(msg);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this collection? This cannot be undone.")) return;
    const result = await deleteCollectionAction({ collectionId: id });
    if (!result.ok) {
      toast.error("Failed to delete collection.");
    }
    load();
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-36 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Collections</h1>
          <p className="text-sm text-muted-foreground">
            {collections.length} {collections.length === 1 ? "collection" : "collections"}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 rounded-full">
          <Plus className="h-4 w-4" />
          New Collection
        </Button>
      </div>

      {showCreate && (
        <CreateCollectionDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {collections.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-2xl p-12 text-center">
          <Library className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No collections yet</h3>
          <p className="mb-6 text-sm text-muted-foreground">
            Create your first collection to start organizing your favorite titles.
          </p>
          <Button onClick={() => setShowCreate(true)} className="gap-2 rounded-full">
            <Plus className="h-4 w-4" />
            Create Collection
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onDelete={() => handleDelete(collection.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}