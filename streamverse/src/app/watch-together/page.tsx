import Link from "next/link";
import { Users } from "lucide-react";

import { RoomCreator } from "@/components/watch-together/room-creator";
import { ConfigNotice } from "@/components/common/config-notice";
import { EmptyState } from "@/components/common/empty-state";
import { PageContainer } from "@/components/common/page-container";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata = { title: "Watch Together", description: "Create a room, invite friends, suggest titles, and vote." };
export default async function WatchTogetherPage() {
  if (!isSupabaseConfigured()) return <PageContainer className="space-y-6"><Header /><ConfigNotice service="Supabase" detail="Add Supabase credentials to create and join Watch Together rooms." /></PageContainer>;
  const user = await getCurrentUser();
  if (!user) return <PageContainer className="space-y-6"><Header /><EmptyState icon={Users} title="Sign in to start a watch party" description="Create a room, invite friends, and vote on what to watch." action={<Button asChild><Link href="/login?next=/watch-together">Sign in</Link></Button>} /></PageContainer>;
  return <PageContainer className="space-y-8"><Header /><RoomCreator /><p className="text-center text-sm text-muted-foreground">Create a room to get a private shareable invite link.</p></PageContainer>;
}
function Header() { return <header className="mx-auto max-w-2xl space-y-2 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary"><Users /></div><h1 className="text-3xl font-bold">Watch Together</h1><p className="text-muted-foreground">Stop debating. Suggest titles, vote live, and let Zynora help your group decide.</p></header>; }
