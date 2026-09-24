import { Clapperboard, Compass, Dna, Flame, FolderOpen, Globe, Heart, Home, ListMusic, Sparkles, Tv, Users, User, Clock, BookOpen, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match child routes too (e.g. /movies/123). */
  prefix?: boolean;
}

/** Primary nav items shown in the top bar (like TMDB). */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Movies", href: "/movies", icon: Clapperboard, prefix: true },
  { label: "TV Shows", href: "/tv", icon: Tv, prefix: true },
  { label: "Anime", href: "/anime", icon: Sparkles, prefix: true },
  { label: "Community", href: "/community", icon: Globe, prefix: true },
  { label: "Discover", href: "/discover", icon: Compass, prefix: true },
];

/** Items that go in the "More" dropdown. */
export const MORE_NAV: NavItem[] = [
  { label: "Watch Together", href: "/watch-together", icon: Users, prefix: true },
];

/** Right-side action items. */
export const ACTION_NAV: NavItem[] = [
  { label: "Watch Queue", href: "/watch-queue", icon: ListMusic, prefix: true },
  { label: "My World", href: "/watchlist", icon: Heart, prefix: true },
];

/** User dropdown items (logged in). */
export const USER_DROPDOWN: NavItem[] = [
  { label: "Dashboard", href: "/profile", icon: User, prefix: true },
  { label: "Watch History", href: "/history", icon: Clock, prefix: true },
  { label: "Reviews", href: "/reviews", icon: BookOpen, prefix: true },
  { label: "Collections", href: "/collections", icon: FolderOpen, prefix: true },
  { label: "Entertainment DNA", href: "/dna", icon: Dna, prefix: true },
  { label: "Settings", href: "/settings", icon: Settings, prefix: true },
];

/** Maintain backward compatibility — full list for mobile nav. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Trending", href: "/", icon: Flame },
  { label: "Movies", href: "/movies", icon: Clapperboard, prefix: true },
  { label: "TV Shows", href: "/tv", icon: Tv, prefix: true },
  { label: "Anime", href: "/anime", icon: Sparkles, prefix: true },
  { label: "Community", href: "/community", icon: Globe, prefix: true },
  { label: "Dashboard", href: "/profile", icon: User, prefix: true },
  { label: "History", href: "/history", icon: Clock, prefix: true },
  { label: "My World", href: "/watchlist", icon: Heart, prefix: true },
  { label: "Watch Queue", href: "/watch-queue", icon: ListMusic, prefix: true },
  { label: "Watch Together", href: "/watch-together", icon: Users, prefix: true },
  { label: "Reviews", href: "/reviews", icon: BookOpen, prefix: true },
  { label: "Settings", href: "/settings", icon: Settings, prefix: true },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  return item.prefix
    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
    : pathname === item.href;
}