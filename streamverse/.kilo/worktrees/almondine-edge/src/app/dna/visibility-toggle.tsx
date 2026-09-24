"use client";

import { useState, useTransition } from "react";
import { Globe, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setDnaVisibility } from "@/app/actions/dna";

export function DnaVisibilityToggle({
  isPublic: initialIsPublic,
}: {
  isPublic: boolean;
}) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !isPublic;
    startTransition(async () => {
      setIsPublic(next);
      const result = await setDnaVisibility(next);
      if (!result.ok) {
        setIsPublic(!next);
        toast.error("Couldn't update visibility.");
      } else {
        toast.success(
          next
            ? "Your DNA is now public."
            : "Your DNA is now private.",
        );
      }
    });
  }

  const Icon = isPending ? Loader2 : isPublic ? Globe : Lock;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
    >
      <Icon className={isPending ? "size-4 animate-spin" : "size-4"} />
      {isPublic ? "Public" : "Private"}
    </Button>
  );
}