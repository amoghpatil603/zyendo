"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Eye, MessageSquare, Heart, Library } from "lucide-react";
import { SocialFeed } from "@/components/social/social-feed";

export function FriendActivity() {
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Users className="size-5 text-primary" />
        Friend Activity
      </h2>
      <SocialFeed limit={15} showTitle={false} />
    </section>
  );
}
