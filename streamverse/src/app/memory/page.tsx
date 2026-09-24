import Link from "next/link";
import { Brain, LogIn } from "lucide-react";
import type { Metadata } from "next";

import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { MemoryForm } from "@/components/user-memory/memory-form";
import { MemoryGroupedList } from "@/components/user-memory/memory-grouped-list";
import { listUserMemories } from "@/app/actions/user-memory";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "User Memory",
  description: "Your preferences, exclusions, constraints, and context.",
};

export default async function MemoryPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageContainer className="space-y-6">
        <Header />
        <ConfigNotice
          service="Supabase"
          detail="Add Supabase credentials to enable user memory."
        />
      </PageContainer>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageContainer className="space-y-6">
        <Header />
        <EmptyState
          icon={LogIn}
          title="Sign in to manage your memory"
          description="Save preferences, exclusions, and constraints to personalize your experience."
          action={
            <Button asChild>
              <Link href="/login?next=/memory">Sign in</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const result = await listUserMemories();
  const memories = result.ok ? result.memories : [];

  return (
    <PageContainer className="space-y-6">
      <Header count={memories.length} />
      <MemoryForm />
      <MemoryGroupedList memories={memories} />
    </PageContainer>
  );
}

function Header({ count }: { count?: number }) {
  return (
    <header className="space-y-1">
      <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
        <Brain className="size-6" />
        User Memory
      </h1>
      <p className="text-sm text-muted-foreground">
        {count !== undefined && count > 0
          ? `${count} saved ${count === 1 ? "memory" : "memories"}`
          : "Teach Zynora what you like and dislike"}
      </p>
    </header>
  );
}