"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { PageContainer } from "@/components/common/page-container";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[streamverse] route error", error); }, [error]);
  return <PageContainer className="flex min-h-[60vh] items-center justify-center"><section className="glass max-w-md space-y-4 rounded-2xl p-6 text-center"><AlertTriangle className="mx-auto size-8 text-yellow-500" /><h1 className="text-xl font-semibold">Something went wrong</h1><p className="text-sm text-muted-foreground">We couldn&apos;t load this page. Please try again.</p><Button onClick={reset}><RefreshCw /> Try again</Button></section></PageContainer>;
}
