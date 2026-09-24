"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Search, ChevronDown, ChevronUp, X, Eye, EyeOff, RefreshCw,
  Loader2, AlertTriangle, Trash2, Flag, CheckCircle, Star, Film,
  Globe, Lock, FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
  AdminCollection, AdminCollectionDetail, AdminCollectionReport,
} from "@/lib/admin/collection-moderation";

// ---------------------------------------------------------------------------
// Server action wrappers
// ---------------------------------------------------------------------------

async function fetchCollections(params: {
  query?: string; isPublic?: boolean; isHidden?: boolean;
  isFeatured?: boolean; isReported?: boolean; sort?: string; page?: number;
}): Promise<{ items: AdminCollection[]; total: number; page: number; totalPages: number }> {
  const mod = await import("@/lib/admin/collection-moderation");
  return mod.getAdminCollections({
    query: params.query, isPublic: params.isPublic, isHidden: params.isHidden,
    isFeatured: params.isFeatured, isReported: params.isReported,
    sort: params.sort ?? "newest", page: params.page ?? 1, pageSize: 20,
  });
}

async function fetchCollectionDetail(id: string): Promise<AdminCollectionDetail | null> {
  const mod = await import("@/lib/admin/collection-moderation");
  return mod.getAdminCollectionDetail(id);
}

async function toggleHide(id: string, hidden: boolean): Promise<boolean> {
  const mod = await import("@/lib/admin/collection-moderation");
  const r = hidden ? await mod.unhideCollection(id) : await mod.hideCollection(id);
  if (!r.ok) { toast.error(r.error); return false; }
  toast.success(hidden ? "Collection unhidden" : "Collection hidden");
  return true;
}

async function toggleFeature(id: string, featured: boolean): Promise<boolean> {
  const mod = await import("@/lib/admin/collection-moderation");
  const r = featured ? await mod.unfeatureCollection(id) : await mod.featureCollection(id);
  if (!r.ok) { toast.error(r.error); return false; }
  toast.success(featured ? "Unfeatured" : "Featured");
  return true;
}

async function deleteColl(id: string): Promise<boolean> {
  const mod = await import("@/lib/admin/collection-moderation");
  const r = await mod.deleteCollection(id);
  if (!r.ok) { toast.error(r.error); return false; }
  toast.success("Collection deleted");
  return true;
}

async function resolveReport(id: string, resolution: "resolved" | "dismissed"): Promise<boolean> {
  const mod = await import("@/lib/admin/collection-moderation");
  const r = await mod.resolveCollectionReport(id, resolution);
  if (!r.ok) { toast.error(r.error); return false; }
  toast.success(`Report ${resolution}`);
  return true;
}

// ---------------------------------------------------------------------------
// Confirm Dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel, loading }: {
  open: boolean; title: string; description: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void; loading?: boolean;
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
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="mr-1 size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collection Detail Panel
// ---------------------------------------------------------------------------

function CollectionDetailPanel({ collectionId, onClose, onAction }: { collectionId: string; onClose: () => void; onAction: () => void }) {
  const [detail, setDetail] = useState<AdminCollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchCollectionDetail(collectionId).then((d) => { setDetail(d); setLoading(false); });
  }, [collectionId]);

  async function handleToggleHide() {
    if (!detail) return;
    setActionLoading(true);
    const ok = await toggleHide(collectionId, detail.isHidden);
    setActionLoading(false);
    if (ok) { onAction(); setDetail({ ...detail, isHidden: !detail.isHidden }); }
  }

  async function handleToggleFeature() {
    if (!detail) return;
    setActionLoading(true);
    const ok = await toggleFeature(collectionId, detail.isFeatured);
    setActionLoading(false);
    if (ok) { onAction(); setDetail({ ...detail, isFeatured: !detail.isFeatured }); }
  }

  async function handleDelete() {
    setActionLoading(true);
    const ok = await deleteColl(collectionId);
    setActionLoading(false);
    setConfirmDelete(false);
    if (ok) { onAction(); onClose(); }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:static lg:bg-transparent lg:backdrop-blur-none" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-border/60 bg-background/95 backdrop-blur-xl lg:relative lg:inset-auto">
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border/60 p-4">
            <h2 className="font-semibold">Collection Details</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="size-4" /></Button>
          </div>

          {loading ? (
            <div className="space-y-4 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : detail ? (
            <div className="space-y-6 p-4">
              {/* Cover */}
              <div className="flex h-32 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
                {detail.coverImageUrl ? (
                  <img src={detail.coverImageUrl} alt={detail.name} className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <Film className="size-12 text-primary/40" />
                )}
              </div>

              {/* Owner */}
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  {detail.ownerDisplayName?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="font-medium">{detail.ownerDisplayName ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{detail.itemCount} items</p>
                </div>
              </div>

              <div>
                <p className="text-lg font-semibold">{detail.name}</p>
                {detail.description && <p className="text-sm text-muted-foreground mt-1">{detail.description}</p>}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium", detail.isPublic ? "bg-green-500/15 text-green-500" : "bg-yellow-500/15 text-yellow-500")}>
                  {detail.isPublic ? <Globe className="size-3" /> : <Lock className="size-3" />}
                  {detail.isPublic ? "Public" : "Private"}
                </span>
                <span className={cn("rounded-full px-3 py-1 text-xs font-medium", detail.isHidden ? "bg-red-500/15 text-red-500" : "bg-green-500/15 text-green-500")}>
                  {detail.isHidden ? "Hidden" : "Visible"}
                </span>
                <span className={cn("rounded-full px-3 py-1 text-xs font-medium", detail.isFeatured ? "bg-purple-500/15 text-purple-500" : "bg-muted text-muted-foreground")}>
                  {detail.isFeatured ? "Featured" : "Standard"}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">Created {new Date(detail.createdAt).toLocaleDateString()}</p>

              {/* Preview items */}
              {detail.previewItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Preview Items ({detail.previewItems.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {detail.previewItems.map((item, i) => (
                      <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {item.mediaType}:{item.mediaId.slice(0, 8)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reports */}
              {detail.reports.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Reports ({detail.reports.length})</p>
                  <div className="space-y-2">
                    {detail.reports.map((r) => (
                      <div key={r.id} className="glass rounded-xl border border-border/60 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{r.reason}</span>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium",
                            r.status === "pending" ? "bg-yellow-500/15 text-yellow-500" :
                            r.status === "resolved" ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground")}>{r.status}</span>
                        </div>
                        {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                        {r.status === "pending" && (
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => { resolveReport(r.id, "resolved"); onAction(); }}>
                              <CheckCircle className="mr-1 size-3" /> Resolve
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { resolveReport(r.id, "dismissed"); onAction(); }}>
                              <X className="mr-1 size-3" /> Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 border-t border-border/60 pt-4">
                <p className="text-xs font-semibold text-muted-foreground">Moderation Actions</p>
                <Button variant="secondary" className="w-full" onClick={handleToggleHide} disabled={actionLoading}>
                  {detail.isHidden ? <Eye className="mr-2 size-4" /> : <EyeOff className="mr-2 size-4" />}
                  {detail.isHidden ? "Unhide Collection" : "Hide Collection"}
                </Button>
                <Button variant="secondary" className="w-full" onClick={handleToggleFeature} disabled={actionLoading}>
                  <Star className="mr-2 size-4" />
                  {detail.isFeatured ? "Unfeature" : "Feature Collection"}
                </Button>
                <Button variant="destructive" className="w-full" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="mr-2 size-4" /> Delete Collection
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">Failed to load collection.</div>
          )}
        </div>
      </div>

      <ConfirmDialog open={confirmDelete} title="Delete Collection" confirmLabel="Delete"
        description="This collection and all its items will be permanently removed."
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} loading={actionLoading} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Admin Collections Client
// ---------------------------------------------------------------------------

export function AdminCollectionsClient() {
  const [items, setItems] = useState<AdminCollection[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "public" | "private" | "hidden" | "featured" | "reported">("all");
  const [sort, setSort] = useState("newest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadItems = useCallback(async (p: number) => {
    setLoading(true);
    const r = await fetchCollections({
      query: searchQuery,
      isPublic: filter === "public" ? true : filter === "private" ? false : undefined,
      isHidden: filter === "hidden" ? true : undefined,
      isFeatured: filter === "featured" ? true : undefined,
      isReported: filter === "reported" ? true : undefined,
      sort, page: p,
    });
    setItems(r.items); setTotal(r.total); setPage(r.page); setTotalPages(r.totalPages);
    setLoading(false);
  }, [searchQuery, filter, sort]);

  useEffect(() => { loadItems(1); }, [loadItems]);

  function handleSearch(value: string) {
    setSearchQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadItems(1), 300);
  }

  return (
    <div className="relative">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or description..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border/60 p-0.5 overflow-x-auto">
            {(["all", "public", "private", "hidden", "featured", "reported"] as const).map((f) => (
              <button key={f} className={cn("whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition", filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="icon" onClick={() => loadItems(page)} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">Sort:</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-border/60 bg-background px-2 py-1 text-xs">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="most_items">Most Items</option>
            <option value="most_reported">Most Reported</option>
          </select>
          <span className="text-xs text-muted-foreground ml-auto">{total} collection{total !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-border/60 glass p-4">
              <Skeleton className="size-12 rounded-xl" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div>
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="glass rounded-2xl border border-border/60 p-8 text-center">
            <FolderOpen className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No collections found.</p>
          </div>
        ) : (
          items.map((col) => (
            <div key={col.id} className={cn(
              "flex cursor-pointer items-center gap-4 rounded-xl border border-border/60 glass p-4 transition hover:border-primary/30",
              selectedId === col.id && "border-primary/40",
            )} onClick={() => setSelectedId(col.id === selectedId ? null : col.id)}>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                {col.coverImageUrl ? <img src={col.coverImageUrl} alt="" className="h-full w-full rounded-xl object-cover" /> : <Film className="size-5 text-primary/40" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{col.name}</p>
                <p className="text-xs text-muted-foreground">
                  {col.userName ?? "Unknown"} · {col.itemCount} item{col.itemCount !== 1 ? "s" : ""} · {new Date(col.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {col.reportCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-500">
                    <Flag className="size-3" /> {col.reportCount}
                  </span>
                )}
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                  col.isFeatured ? "bg-purple-500/15 text-purple-500" : col.isHidden ? "bg-red-500/15 text-red-500" : "bg-green-500/15 text-green-500")}>
                  {col.isFeatured ? "Featured" : col.isHidden ? "Hidden" : "Visible"}
                </span>
              </div>
              <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", selectedId === col.id && "rotate-180")} />
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => loadItems(page - 1)}>Previous</Button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => loadItems(page + 1)}>Next</Button>
        </div>
      )}

      {selectedId && (
        <div className="fixed inset-0 z-30 lg:absolute lg:inset-auto lg:left-auto lg:right-0 lg:top-0 lg:h-full">
          <CollectionDetailPanel collectionId={selectedId} onClose={() => setSelectedId(null)} onAction={() => loadItems(page)} />
        </div>
      )}
    </div>
  );
}
