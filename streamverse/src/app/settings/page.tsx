import { Suspense } from "react";
import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { SettingsClient } from "@/components/settings/settings-client";
import { Settings, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings and preferences.",
};

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <ConfigNotice
          service="Supabase"
          detail="Add Supabase credentials to enable settings."
        />
      </PageContainer>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageContainer className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Settings className="mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-2xl font-bold">Sign in to manage settings</h1>
          <p className="mb-6 text-muted-foreground">
            Customize your account, notifications, and preferences.
          </p>
          <Button asChild>
            <a href="/login?next=/settings">Sign in</a>
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6 pb-16">
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsClient userId={user.id} />
      </Suspense>
    </PageContainer>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <div className="space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}
