"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Search, Users, Loader2, MessageSquare, Library, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/common/page-container";
import type { UserSearchResult } from "@/types/social";

export const dynamic = "force-dynamic";

export default function UsersSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function handleSearch(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    if (!value.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const mod = await import("@/lib/social/social-actions");
        const users = await mod.searchUsers(value);
        setResults(users);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  return (
    <PageContainer className="space-y-8 pb-16">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <Users className="size-6 text-primary" />
          Community
        </h1>
        <p className="text-sm text-muted-foreground">Find and follow other Zynora users</p>
      </div>

      {/* Search */}
      <div className="relative mx-auto max-w-xl">
        <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by username..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-12 pl-12 text-base"
          autoFocus
        />
      </div>

      {/* Results */}
      <div className="mx-auto max-w-2xl space-y-2">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="glass rounded-2xl border border-border/60 p-8 text-center">
            <Users className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No users found matching "{query}"</p>
          </div>
        )}

        {!loading && results.map((user) => (
          <Link
            key={user.id}
            href={`/users/${user.id}`}
            className="flex items-center gap-4 rounded-xl border border-border/60 glass p-4 transition hover:border-primary/30"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-lg font-bold text-white">
              {user.displayName?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.displayName ?? "Anonymous"}</p>
              <p className="text-xs text-muted-foreground">
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
              <span title="Reviews"><MessageSquare className="mr-0.5 inline size-3" />{user.reviewCount}</span>
              <span title="Collections"><Library className="mr-0.5 inline size-3" />{user.collectionCount}</span>
              <span title="Followers"><Heart className="mr-0.5 inline size-3" />{user.followerCount}</span>
            </div>
          </Link>
        ))}

        {!searched && !loading && query.length === 0 && (
          <div className="glass rounded-2xl border border-border/60 p-8 text-center">
            <Users className="mx-auto mb-2 size-12 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Search for users by display name</p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
