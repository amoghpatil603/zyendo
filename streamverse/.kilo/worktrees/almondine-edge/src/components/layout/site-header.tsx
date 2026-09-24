import Link from "next/link";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { MainNav } from "./main-nav";
import { MobileNav } from "./mobile-nav";
import { SearchBar } from "./search-bar";
import { UserMenu, type SessionUser } from "./user-menu";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const sessionUser: SessionUser | null = user
    ? {
        displayName:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          user.email?.split("@")[0] ??
          "You",
        email: user.email ?? "",
        avatarUrl: user.user_metadata?.avatar_url as string | undefined,
      }
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <MobileNav />

        <Link href="/" className="flex items-center gap-2 font-bold">
          <Sparkles className="size-6 text-primary" />
          <span className="text-gradient hidden text-lg sm:inline">
            StreamVerse
          </span>
        </Link>

        <div className="mx-1">
          <MainNav />
        </div>

        <div className="ml-auto flex flex-1 items-center justify-end gap-3">
          <Suspense fallback={null}>
            <SearchBar className="hidden max-w-xs md:block" />
          </Suspense>
          <UserMenu user={sessionUser} />
        </div>
      </div>

      <div className="border-t border-border/60 px-4 py-2 md:hidden">
        <Suspense fallback={null}>
          <SearchBar />
        </Suspense>
      </div>
    </header>
  );
}
