"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCollectionAction } from "@/app/actions/collections";

export function DeleteCollectionButton({
  collectionId,
}: {
  collectionId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={async () => {
        startTransition(async () => {
          const result = await deleteCollectionAction({ collectionId });
          if (result.ok) {
            toast.success("Collection deleted.");
            window.location.href = "/collections";
          } else {
            toast.error("Couldn't delete collection. Try again.");
          }
        });
      }}
    >
      <Button
        type="submit"
        variant="destructive"
        size="icon"
        disabled={isPending}
        aria-label="Delete collection"
      >
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}