"use client";

import Link from "next/link";
import { Bell, LogOut, User as UserIcon, ChevronDown } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { USER_DROPDOWN, isActive } from "./nav-items";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface SessionUser {
  displayName: string;
  email: string;
  avatarUrl?: string;
}

export function UserMenu({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();

  if (!user) {
    return (
      <Button asChild size="sm" variant="ghost" className="gap-2 rounded-full">
        <Link href="/login">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-medium">Sign In</span>
        </Link>
      </Button>
    );
  }

  const initials =
    user.displayName
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          <Avatar className="h-8 w-8 border-2 border-border">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.displayName} />
            ) : null}
            <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 glass border-border/60">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-medium">{user.displayName}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {USER_DROPDOWN.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3",
                  active && "text-primary font-medium",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action="/auth/signout" method="post" className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-3 text-left text-destructive"
            >
              <LogOut className="size-4" />
              Sign Out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NotificationBell() {
  return (
    <button
      type="button"
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
        0
      </span>
    </button>
  );
}