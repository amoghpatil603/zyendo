"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchQueueLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[220px]" />
        <Skeleton className="h-8 w-[160px]" />
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}

