"use client";

import { AlertTriangle, RefreshCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/common/page-container";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[streamverse] TV Detail Boundary Error:", error);
  }, [error]);

  return (
    <PageContainer className="flex min-h-[50vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Failed to load TV details
        </h2>
        <p className="text-muted-foreground">
          There was a problem communicating with the external database.
        </p>
      </div>
      <Button onClick={() => reset()} variant="outline" className="gap-2">
        <RefreshCcw className="size-4" />
        Try Again
      </Button>
    </PageContainer>
  );
}
