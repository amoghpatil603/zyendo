"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Search, ChevronDown, ChevronUp, X,
  UserCheck, UserX, Shield, Trash2, Eye, RefreshCw,
  Loader2, AlertTriangle, Clock, Star, Archive, Activity,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  AdminRole, AdminUser, AdminUserDetail, UserStatus,
  PaginatedResult,
} from "@/types/admin";

// ---------------------------------------------------------------------------
// Server action wrappers (imported dynamically to keep client chunk small)
// ---------------------------------------------------------------------------

async function fetchUsers(params: {
  query?: string;
  role?: AdminRole | "";
  status?: UserStatus | "";
  sort?: string;
  page?: number;
}): Promise<PaginatedResult<AdminUser>> {
  const mod = await import("@/lib/admin/user-management");
  return mod.getAdminUsers({
    query: params.query,
    role: (params.role as AdminRole | "") || undefined,
    status: (params.status as UserStatus | "") || undefined,
    sort: (params.sort as "newest" | "oldest" | "most_reviews" | "most_collections") ?? "newest",
    page: params.page ?? 1,
    pageSize: 20,
  });
}

async function fetchUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const mod = await import("@/lib/admin/user-management");
  return mod.getAdminUserDetail(userId);
}

async function changeRole(userId: string, role: AdminRole): Promise<boolean> {
  const mod = await import("@/lib/admin/user-management");
  const result = await mod.changeUserRole(userId, role);
  if (!result.ok) { toast.error(result.error); return false; }
  toast.success("Role updated");
  return true;
}

async function updateStatus(userId: string, status: UserStatus): Promise<boolean> {
  const mod = await import("@/lib/admin/user-management");
  const result = await mod.updateUserStatus(userId, status);
  if (!result.ok) { toast.error(result.error); return false; }
  toast.success(`User ${status}`);
  return true;
}

async function deleteUserAccount(userId: string): Promise<boolean> {
  const mod = await import("@/lib/admin/user-management");
  const result = await mod.deleteUser(userId);
  if (!result.ok) { toast.error(result.error); return false; }
  toast.success("User deleted");
  return true;
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

const ROLE_BADGE: Record<AdminRole, { className: string; label: string }> = {
  admin: { className: "bg-purple-500/15 text-purple-500 border-purple-500/30", label: "Admin" },
  moderator: { className: "bg-blue-500/15 text-blue-500 border-blue-500/30", label: "Mod" },
  viewer: { className: "bg-muted text-muted-foreground border-border/60", label: "User" },
};

const STATUS_BADGE: Record<UserStatus, { className: string; label: string }> = {
  active: { className: "bg-green-500/15 text-green-500", label: "Active" },
  suspended: { className: "bg-yellow-500/15 text-yellow-500", label: "Suspended" },
  banned: { className: "bg-red-500/15 text-red-500", label: "Banned" },
};

// ---------------------------------------------------------------------------
// Confirm Dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open, title, description, confirmLabel, confirmVariant, onConfirm, onCancel, loading,
}: {
  open: boolean; title: string; description: string; confirmLabel: string;
  confirmVariant?: "destructive" | "default"; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="glass w-full max-w-md rounded-2xl border border-border/60 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant={confirmVariant ?? "destructive"} onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-1 size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Detail Side Panel
// ---------------------------------------------------------------------------

function UserDetailPanel({ userId, onClose, onAction }: { userId: string; onClose: () => void; onAction: () => void }) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleOpen, setRoleOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "suspend" | "unsuspend" | "ban" | "unban" | "delete" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchUserDetail(userId).then((d) => { setDetail(d); setLoading(false); });
  }, [userId]);

  async function handleRoleChange(newRole: AdminRole) {
    const ok = await changeRole(userId, newRole);
    if (ok) { setRoleOpen(false); onAction(); }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    setActionLoading(true);
    let ok = false;
    switch (confirmAction.type) {
      case "suspend": ok = await updateStatus(userId, "suspended"); break;
      case "unsuspend": ok = await updateStatus(userId, "active"); break;
      case "ban": ok = await updateStatus(userId, "banned"); break;
      case "unban": ok = await updateStatus(userId, "active"); break;
      case "delete": ok = await deleteUserAccount(userId); break;
    }
    setActionLoading(false);
    setConfirmAction(null);
    if (ok) { onAction(); onClose(); }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:static lg:bg-transparent lg:backdrop-blur-none" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-border/60 bg-background/95 backdrop-blur-xl lg:relative lg:inset-auto">
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 p-4">
            <h2 className="font-semibold">User Details</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="size-4" /></Button>
          </div>

          {loading ? (
            <div className="space-y-4 p-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : detail ? (
            <div className="space-y-6 p-4">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-xl font-bold text-primary">
                  {detail.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="font-semibold text-lg">{detail.displayName ?? "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">{detail.email}</p>
                </div>
              </div>

              {/* Role & Status badges */}
              <div className="flex flex-wrap gap-2">
                <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", ROLE_BADGE[detail.role].className)}>
                  {ROLE_BADGE[detail.role].label}
                </span>
                <span className={cn("rounded-full px-3 py-1 text-xs font-medium", STATUS_BADGE[detail.status].className)}>
                  {STATUS_BADGE[detail.status].label}
                </span>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="glass rounded-xl border border-border/60 p-3 text-center">
                  <Star className="mx-auto mb-1 size-4 text-primary" />
                  <p className="text-lg font-bold">{detail.reviewsCount}</p>
                  <p className="text-[10px] text-muted-foreground">Reviews</p>
                </div>
                <div className="glass rounded-xl border border-border/60 p-3 text-center">
                  <Archive className="mx-auto mb-1 size-4 text-primary" />
                  <p className="text-lg font-bold">{detail.collectionsCount}</p>
                  <p className="text-[10px] text-muted-foreground">Collections</p>
                </div>
                <div className="glass rounded-xl border border-border/60 p-3 text-center">
                  <Clock className="mx-auto mb-1 size-4 text-primary" />
                  <p className="text-lg font-bold">{detail.watchQueueCount}</p>
                  <p className="text-[10px] text-muted-foreground">Queue</p>
                </div>
              </div>

              {/* DNA Summary */}
              {detail.dnaSummary && (
                <div className="glass rounded-xl border border-border/60 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Entertainment DNA</p>
                  <p className="text-sm">{detail.dnaSummary.genres} genres tracked</p>
                  <p className="text-xs text-muted-foreground">Last computed: {new Date(detail.dnaSummary.lastComputed ?? "").toLocaleDateString()}</p>
                </div>
              )}

              {/* Recent Activity */}
              {detail.recentActivity.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Recent Activity</p>
                  <div className="space-y-1">
                    {detail.recentActivity.slice(0, 5).map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Activity className="size-3 shrink-0" />
                        <span className="truncate">{a.description}</span>
                        <span className="shrink-0">{new Date(a.timestamp).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 border-t border-border/60 pt-4">
                <p className="text-xs font-semibold text-muted-foreground">Admin Actions</p>

                {/* Role changer */}
                <div className="relative">
                  <Button variant="secondary" className="w-full justify-between" onClick={() => setRoleOpen(!roleOpen)}>
                    Change Role <ChevronDown className={cn("size-3 transition", roleOpen && "rotate-180")} />
                  </Button>
                  {roleOpen && (
                    <div className="glass absolute z-10 mt-1 w-full rounded-xl border border-border/60 p-1 shadow-xl">
                      {(["admin", "moderator", "viewer"] as AdminRole[]).map((r) => (
                        <button
                          key={r}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-muted",
                            detail.role === r && "bg-primary/10 text-primary",
                          )}
                          onClick={() => handleRoleChange(r)}
                        >
                          {r === "admin" ? <Shield className="size-4" /> : r === "moderator" ? <Shield className="size-4" /> : <UserCheck className="size-4" />}
                          {ROLE_BADGE[r].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status actions */}
                {detail.status === "active" && (
                  <Button variant="secondary" className="w-full" onClick={() => setConfirmAction({ type: "suspend" })}>
                    <UserX className="mr-2 size-4" /> Suspend User
                  </Button>
                )}
                {(detail.status === "suspended" || detail.status === "banned") && (
                  <Button variant="secondary" className="w-full" onClick={() => setConfirmAction({ type: "unsuspend" })}>
                    <UserCheck className="mr-2 size-4" /> Reactivate User
                  </Button>
                )}
                <Button variant="destructive" className="w-full" onClick={() => setConfirmAction({ type: "delete" })}>
                  <Trash2 className="mr-2 size-4" /> Delete Account
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">Failed to load user details.</div>
          )}
        </div>
      </div>

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmAction?.type === "suspend"}
        title="Suspend User"
        description="This user will lose access to their account. They can be reactivated later."
        confirmLabel="Suspend"
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={confirmAction?.type === "unsuspend"}
        title="Reactivate User"
        description="Restore full access to this account."
        confirmLabel="Reactivate"
        confirmVariant="default"
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />
      <ConfirmDialog
        open={confirmAction?.type === "delete"}
        title="Delete Account"
        description="This action is permanent. All user data will be removed. Are you sure?"
        confirmLabel="Delete Forever"
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        loading={actionLoading}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Admin Users Client
// ---------------------------------------------------------------------------

export function AdminUsersClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AdminRole | "">("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");
  const [sort, setSort] = useState<string>("newest");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadUsers = useCallback(async (p: number) => {
    setLoading(true);
    const result = await fetchUsers({
      query: searchQuery,
      role: roleFilter as AdminRole | "",
      status: statusFilter as UserStatus | "",
      sort,
      page: p,
    });
    setUsers(result.items);
    setTotal(result.total);
    setPage(result.page);
    setTotalPages(result.totalPages);
    setLoading(false);
  }, [searchQuery, roleFilter, statusFilter, sort]);

  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  function handleSearch(value: string) {
    setSearchQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadUsers(1), 300);
  }

  function refresh() {
    loadUsers(page);
    setSelectedUserId(null);
  }

  return (
    <div className="relative">
      {/* Search & filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
            Filters {showFilters ? <ChevronUp className="ml-1 size-3" /> : <ChevronDown className="ml-1 size-3" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Role:</span>
              {(["", "admin", "moderator", "viewer"] as (AdminRole | "")[]).map((r) => (
                <button
                  key={r}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    roleFilter === r
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/30",
                  )}
                  onClick={() => { setRoleFilter(r); }}
                >
                  {r === "" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status:</span>
              {(["", "active", "suspended", "banned"] as (UserStatus | "")[]).map((s) => (
                <button
                  key={s}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    statusFilter === s
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/30",
                  )}
                  onClick={() => { setStatusFilter(s); }}
                >
                  {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-border/60 bg-background px-2 py-1 text-xs"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="most_reviews">Most Reviews</option>
                <option value="most_collections">Most Collections</option>
              </select>
            </div>
          </div>
        )}

        {/* Results count */}
        <p className="text-xs text-muted-foreground">
          {total} user{total !== 1 ? "s" : ""}
          {searchQuery && <> matching "{searchQuery}"</>}
        </p>
      </div>

      {/* User table */}
      <div className="mt-4 space-y-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-border/60 glass p-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="glass rounded-2xl border border-border/60 p-8 text-center">
            <Eye className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No users found.</p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className={cn(
                "flex cursor-pointer items-center gap-4 rounded-xl border border-border/60 glass p-4 transition hover:border-primary/30",
                selectedUserId === user.id && "border-primary/40",
              )}
              onClick={() => setSelectedUserId(user.id === selectedUserId ? null : user.id)}
            >
              {/* Avatar */}
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {user.displayName?.charAt(0)?.toUpperCase() ?? "?"}
              </div>

              {/* Name + ID */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.displayName ?? "Unknown"}</p>
                <p className="truncate text-xs text-muted-foreground">{user.id.slice(0, 8)}...</p>
              </div>

              {/* Stats */}
              <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
                <span title="Reviews">{user.reviewsCount} reviews</span>
                <span title="Collections">{user.collectionsCount} col.</span>
                <span title="Watch Queue">{user.watchQueueCount} queued</span>
              </div>

              {/* Role badge */}
              <span className={cn("hidden rounded-full border px-3 py-0.5 text-xs font-medium md:inline", ROLE_BADGE[user.role].className)}>
                {ROLE_BADGE[user.role].label}
              </span>

              {/* Status badge */}
              <span className={cn("rounded-full px-3 py-0.5 text-xs font-medium", STATUS_BADGE[user.status].className)}>
                {STATUS_BADGE[user.status].label}
              </span>

              {/* Chevron */}
              <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", selectedUserId === user.id && "rotate-180")} />
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => loadUsers(page - 1)}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => loadUsers(page + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* User Detail Side Panel */}
      {selectedUserId && (
        <div className="fixed inset-0 z-30 lg:absolute lg:inset-auto lg:left-auto lg:right-0 lg:top-0 lg:h-full">
          <UserDetailPanel
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
            onAction={() => loadUsers(page)}
          />
        </div>
      )}
    </div>
  );
}
