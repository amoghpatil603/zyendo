"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { recomputeDna } from "@/app/actions/dna";

export function RecomputeDnaButton() {
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState("Recompute DNA");

  function handleClick() {
    startTransition(async () => {
      setLabel("Computing...");
      const result = await recomputeDna();
      if (result.ok) {
        toast.success("Your Entertainment DNA has been updated.");
      } else {
        toast.error("Couldn't recompute DNA. Try again.");
      }
      setLabel("Recompute DNA");
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      {label}
    </Button>
  );
}