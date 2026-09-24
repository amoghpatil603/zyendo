"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Users, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { UserSearchResult } from "@/types/social";

export function TrendingUsers() {
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/lib/social/social-actions");
      const data = await mod.getTrendingUsers(5);
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 rounded-xl border border-border/60 glass p-3">
            <div className="size-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-2 w-16 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 glass p-4 text-center text-sm text-muted-foreground">
        No users to show yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <Link
          key={user.id}
          href={`/users/${user.id}`}
          className="flex items-center gap-3 rounded-xl border border-border/60 glass p-3 transition hover:border-primary/30"
        >
          <Avatar className="size-8">
            <AvatarFallback>
              {user.displayName?.charAt(0)?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.displayName ?? "Anonymous"}</p>
            <p className="text-xs text-muted-foreground">
              {user.followerCount} {user.followerCount === 1 ? "follower" : "followers"}
            </p>
          </div>
          <TrendingUp className="size-4 text-primary shrink-0" />
        </Link>
      ))}
    </div>
  );
}
