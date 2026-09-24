"use client";

import { useState } from "react";
import Link from "next/link";
import type { Collection } from "@/types/collection";
import { Film, Lock, Globe, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CollectionCardProps {
  collection: Collection;
  onDelete?: () => void;
}

export function CollectionCard({ collection, onDelete }: CollectionCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="glass group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.01]">
      {/* Cover image or gradient placeholder */}
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
        {collection.coverImageUrl && !imageError ? (
          <img
            src={collection.coverImageUrl}
            alt={collection.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Film className="h-12 w-12 text-primary/40" />
          </div>
        )}

        {/* Public/Private badge */}
        <div className="absolute top-3 right-3">
          {collection.isPublic ? (
            <span className="flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-xs backdrop-blur-sm">
              <Globe className="h-3 w-3" />
              Public
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-xs backdrop-blur-sm">
              <Lock className="h-3 w-3" />
              Private
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/collections/${collection.id}`} className="flex-1">
          <h3 className="mb-1 line-clamp-1 font-semibold transition-colors group-hover:text-primary">
            {collection.name}
          </h3>
          {collection.description && (
            <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
              {collection.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {collection.itemCount} {collection.itemCount === 1 ? "title" : "titles"}
          </p>
        </Link>

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between">
          <Link href={`/collections/${collection.id}`}>
            <Button variant="ghost" size="sm" className="text-xs">
              View
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/collections/${collection.id}`}>Edit</Link>
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}