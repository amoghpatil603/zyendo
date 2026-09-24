"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import type { Trailer } from "@/types/media-item";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Plays an official trailer via the YouTube embed player. Only official
 * trailers (no copyrighted full content) are ever embedded.
 */
export function TrailerEmbed({ trailers }: { trailers: Trailer[] }) {
  const [open, setOpen] = useState(false);
  const trailer = trailers[0];
  if (!trailer) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Play className="size-4" />
          Watch Trailer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl p-0 sm:max-w-3xl">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-base">{trailer.name}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full overflow-hidden rounded-b-lg">
          {open ? (
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0`}
              title={trailer.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
