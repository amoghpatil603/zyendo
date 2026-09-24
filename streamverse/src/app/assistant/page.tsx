import type { Metadata } from "next";

import { AssistantChat } from "@/components/assistant/assistant-chat";
import { PageContainer } from "@/components/common/page-container";
import { ConfigNotice } from "@/components/common/config-notice";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { isAIConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";
import { LogIn } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AI Assistant", description: "Your personal entertainment copilot — powered by Groq." };

export default async function AssistantPage() {
  if (!isAIConfigured()) {
    return (
      <PageContainer className="flex items-center justify-center py-20">
        <div className="glass rounded-2xl p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold">AI Assistant</h1>
          <p className="mb-4 text-sm text-muted-foreground">Your entertainment copilot</p>
          <ConfigNotice service="Groq" detail="Add GROQ_API_KEY to enable the AI Assistant." />
        </div>
      </PageContainer>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return (
      <PageContainer className="flex items-center justify-center py-20">
        <EmptyState
          icon={LogIn}
          title="Sign in to ask Zynora"
          description="Your assistant uses your Entertainment DNA and saved preferences to personalize its picks."
          action={
            <Button asChild>
              <Link href="/login?next=/assistant">Sign in</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex items-center justify-center py-8">
      <div className="w-full max-w-[460px]">
        <AssistantChat compact />
      </div>
    </PageContainer>
  );
}
