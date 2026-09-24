import Link from "next/link";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";

import { getCurrentUser, createSupabaseServerClient } from "@/lib/supabase/server";
import { MainNav } from "./main-nav";
import { MobileNav } from "./mobile-nav";
import { SearchBar } from "./search-bar";
import { ExpandableSearch } from "./expandable-search";
import { UserMenu, NotificationBell, type SessionUser } from "./user-menu";
import { ACTION_NAV } from "./nav-items";

export async function SiteHeader() {
  const user = await getCurrentUser();
  let avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  if (user) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.avatar_url) {
      avatarUrl = data.avatar_url;
    }
  }

  const sessionUser: SessionUser | null = user
    ? {
        displayName:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          user.email?.split("@")[0] ??
          "You",
        email: user.email ?? "",
        avatarUrl,
      }
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4">
        {/* Mobile hamburger */}
        <MobileNav />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-gradient hidden text-lg font-bold sm:inline">
            Zynora
          </span>
        </Link>

        {/* Primary navigation — desktop only */}
        <div className="mx-2">
          <MainNav />
        </div>

        {/* Right section */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Expandable search — desktop */}
          <div className="hidden lg:block">
            <ExpandableSearch />
          </div>

          {/* Action icons */}
          {ACTION_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label={item.label}
                title={item.label}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}

          {/* Notification bell */}
          <NotificationBell />

          {/* User menu */}
          <UserMenu user={sessionUser} />
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="border-t border-border/60 px-4 py-2 lg:hidden">
        <Suspense fallback={null}>
          <SearchBar />
        </Suspense>
      </div>
    </header>
  );
}

