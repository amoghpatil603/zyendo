"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCollectionAction, updateCollectionAction } from "@/app/actions/collections";
import type { Collection } from "@/types/collection";

export function CollectionForm({
  collection,
  onSuccess,
}: {
  collection?: Collection | null;
  onSuccess?: () => void;
}) {
  const [name, setName] = useState(collection?.name ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(collection?.coverImageUrl ?? "");
  const [isPublic, setIsPublic] = useState(collection?.isPublic ?? false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Collection name is required.");
      return;
    }

    startTransition(async () => {
      const result = collection
        ? await updateCollectionAction({
            collectionId: collection.id,
            name: name.trim(),
            description: description.trim() || null,
            coverImageUrl: coverImageUrl.trim() || null,
            isPublic,
          })
        : await createCollectionAction({
            name: name.trim(),
            description: description.trim() || undefined,
            coverImageUrl: coverImageUrl.trim() || undefined,
            isPublic,
          });

      if (result.ok) {
        toast.success(collection ? "Collection updated." : "Collection created.");
        onSuccess?.();
      } else {
        toast.error("Couldn't save collection. Try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass space-y-3 rounded-xl p-4">
      <div className="space-y-2">
        <label htmlFor="collection-name" className="text-sm font-medium">Name</label>
        <Input
          id="collection-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Collection"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="collection-description" className="text-sm font-medium">Description</label>
        <Input
          id="collection-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="collection-cover" className="text-sm font-medium">Cover Image URL</label>
        <Input
          id="collection-cover"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="https://..."
          type="url"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3">
        <div className="space-y-0.5">
          <label htmlFor="isPublic" className="text-sm font-medium">
            Make Public
          </label>
          <p className="text-xs text-muted-foreground">
            Allow others to view this collection
          </p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            id="isPublic"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
          <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {collection ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
