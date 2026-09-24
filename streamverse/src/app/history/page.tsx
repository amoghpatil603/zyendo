import { Suspense } from "react";
import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { HistoryClient } from "@/components/history/history-client";
import { History as HistoryIcon, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "History",
  description: "View and manage your watch history.",
};

export default async function HistoryPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <ConfigNotice
          service="Supabase"
          detail="Add Supabase credentials to enable watch history."
        />
      </PageContainer>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageContainer className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <HistoryIcon className="mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-2xl font-bold">Sign in to view history</h1>
          <p className="mb-6 text-muted-foreground">
            Track what you've watched.
          </p>
          <Button asChild>
            <a href="/login?next=/history">Sign in</a>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6 pb-16">
      <Suspense fallback={<div className="py-8 text-center text-muted-foreground">Loading history...</div>}>
        <HistoryClient userId={user.id} />
      </Suspense>
    </PageContainer>
  );
}
