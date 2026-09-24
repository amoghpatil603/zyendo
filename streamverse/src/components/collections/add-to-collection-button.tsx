"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addItemToCollectionAction,
  removeItemFromCollectionAction,
} from "@/app/actions/collections";
import type { CollectionMembership } from "@/types/collection";

export function AddToCollectionButton({
  mediaType,
  mediaId,
  isAuthenticated,
}: {
  mediaType: string;
  mediaId: string;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [memberships, setMemberships] = useState<CollectionMembership[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    let mounted = true;
    
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/collections/memberships?mediaType=${mediaType}&mediaId=${mediaId}`);
        if (res.ok) {
          const data = await res.json();
          if (mounted) setMemberships(data);
        }
      } catch (err) {
        console.error("Failed to load collection memberships", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    
    load();
    return () => { mounted = false; };
  }, [isOpen, isAuthenticated, mediaType, mediaId]);

  function handleToggle(collectionId: string, currentlyInCollection: boolean) {
    // Optimistic update
    setMemberships((prev) =>
      prev.map((m) =>
        m.collectionId === collectionId ? { ...m, inCollection: !currentlyInCollection } : m
      )
    );

    startTransition(async () => {
      let result;
      if (currentlyInCollection) {
        result = await removeItemFromCollectionAction({ collectionId, mediaType, mediaId });
      } else {
        result = await addItemToCollectionAction({ collectionId, mediaType, mediaId });
      }

      if (!result.ok) {
        // Revert on failure
        setMemberships((prev) =>
          prev.map((m) =>
            m.collectionId === collectionId ? { ...m, inCollection: currentlyInCollection } : m
          )
        );
        toast.error("Failed to update collection. Try again.");
      } else {
        toast.success(
           currentlyInCollection ? "Removed from collection." : "Added to collection."
        );
      }
    });
  }

  function handleOpenClick() {
    if (!isAuthenticated) {
      toast.info("Sign in to add to collections.");
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setIsOpen(true);
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" onClick={handleOpenClick}>
          <FolderPlus className="size-4" />
          Add to Collection
        </Button>
      </DropdownMenuTrigger>
      {isAuthenticated && (
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Your Collections</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isLoading ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : memberships.length === 0 ? (
             <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No collections yet.
             </div>
          ) : (
            memberships.map((m) => (
              <DropdownMenuCheckboxItem
                key={m.collectionId}
                checked={m.inCollection}
                onCheckedChange={() => handleToggle(m.collectionId, m.inCollection)}
                disabled={isPending}
              >
                <span className="truncate">{m.name}</span>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
