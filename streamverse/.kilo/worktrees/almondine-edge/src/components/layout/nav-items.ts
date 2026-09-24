import { Clapperboard, Dna, Flame, Heart, Tv } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match child routes too (e.g. /movies/123). */
  prefix?: boolean;
}

/**
 * Assistant-flavored primary navigation. Only routes that exist in Phase 1 are
 * linked — later phases (AI Picks, Mood, Watch Together) slot in here.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Trending", href: "/", icon: Flame },
  { label: "Movies", href: "/movies", icon: Clapperboard, prefix: true },
  { label: "TV Shows", href: "/tv", icon: Tv, prefix: true },
  { label: "My World", href: "/watchlist", icon: Heart, prefix: true },
  { label: "My DNA", href: "/dna", icon: Dna, prefix: true },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  return item.prefix
    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
    : pathname === item.href;
}
