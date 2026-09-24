import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { ConfigNotice } from "@/components/common/config-notice";
import { PageContainer } from "@/components/common/page-container";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/";

  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (user) redirect(safeNext);
  }

  return (
    <PageContainer className="flex min-h-[70vh] items-center justify-center">
      {isSupabaseConfigured() ? (
        <LoginForm next={safeNext} />
      ) : (
        <div className="max-w-md space-y-4">
          <ConfigNotice
            service="Supabase Auth"
            detail="Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable sign in. You can still browse the catalog without an account."
          />
          <Link href="/" className="text-sm text-primary hover:underline">
            ← Back to browsing
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
