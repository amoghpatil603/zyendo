"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { User, Sparkles } from "lucide-react";

export function WelcomeHeader() {
  const [displayName, setDisplayName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setDisplayName(
          data.user.user_metadata?.full_name ??
            data.user.user_metadata?.name ??
            data.user.email?.split("@")[0] ??
            "Explorer",
        );
        setAvatarUrl(data.user.user_metadata?.avatar_url ?? null);
      }
    });
  }, []);

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <User className="h-6 w-6 text-primary" />
        )}
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Welcome back, {displayName || "Explorer"}
        </h1>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Your personal entertainment dashboard
        </p>
      </div>
    </div>
  );
}