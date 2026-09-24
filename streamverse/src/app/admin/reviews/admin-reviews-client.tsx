"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Search, ChevronDown, ChevronUp, X, Eye, RefreshCw, Loader2,
  AlertTriangle, Star, EyeOff, Trash2, Flag, CheckCircle, Shield,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AdminReview, AdminReviewDetail, AdminReviewReport } from "@/lib/admin/review-moderation";

// ---------------------------------------------------------------------------
// Server action wrappers
// ---------------------------------------------------------------------------

async function fetchReviews(params: {
  query?: string; mediaType?: string; isHidden?: boolean;
  isReported?: boolean; sort?: string; page?: number;
}): Promise<{ items: AdminReview[]; total: number; page: number; totalPages: number }> {
  const mod = await import("@/lib/admin/review-moderation");
  return mod.getAdminReviews({
    query: params.query,
    mediaType: params.mediaType || undefined,
    isHidden: params.isHidden,
    isReported: params.isReported,
    sort: params.sort ?? "newest",
    page: params.page ?? 1,
    pageSize: 20,
  });
}

async function fetchReviewDetail(reviewId: string): Promise<AdminReviewDetail | null> {
  const mod = await import("@/lib/admin/review-moderation");
  return mod.getAdminReviewDetail(reviewId);
}

async function toggleHideReview(reviewId: string, currentlyHidden: boolean): Promise<boolean> {
  const mod = await import("@/lib/admin/review-moderation");
  const result = currentlyHidden ? await mod.unhideReview(reviewId) : await mod.hideReview(reviewId);
  if (!result.ok) { toast.error(result.error); return false; }
  toast.success(currentlyHidden ? "Review unhidden" : "Review hidden");
  return true;
}

async function deleteReviewAction(reviewId: string): Promise<boolean> {
  const mod = await import("@/lib/admin/review-moderation");
  const result = await mod.deleteReview(reviewId);
  if (!result.ok) { toast.error(result.error); return false; }
  toast.success("Review deleted");
  return true;
}

async function resolveReportAction(reportId: string, resolution: "resolved" | "dismissed"): Promise<boolean> {
  const mod = await import("@/lib/admin/review-moderation");
  const result = await mod.resolveReport(reportId, resolution);
  if (!result.ok) { toast.error(result.error); return false; }
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
// Review Detail Panel
// ---------------------------------------------------------------------------

function ReviewDetailPanel({ reviewId, onClose, onAction }: { reviewId: string; onClose: () => void; onAction: () => void }) {
  const [detail, setDetail] = useState<AdminReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchReviewDetail(reviewId).then((d) => { setDetail(d); setLoading(false); });
  }, [reviewId]);

  async function handleToggleHide() {
    if (!detail) return;
    setActionLoading(true);
    const ok = await toggleHideReview(reviewId, detail.isHidden);
    setActionLoading(false);
    if (ok) { onAction(); setDetail({ ...detail, isHidden: !detail.isHidden }); }
  }

  async function handleDelete() {
    setActionLoading(true);
    const ok = await deleteReviewAction(reviewId);
    setActionLoading(false);
    setConfirmDelete(false);
    if (ok) { onAction(); onClose(); }
  }

  async function handleResolveReport(reportId: string, resolution: "resolved" | "dismissed") {
    const ok = await resolveReportAction(reportId, resolution);
    if (ok) onAction();
  }

  const renderStars = (rating: number) => {
    const stars = Math.round(rating / 2);
    return "★".repeat(Math.max(1, stars)) + "☆".repeat(5 - Math.max(1, stars));
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:static lg:bg-transparent lg:backdrop-blur-none" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-border/60 bg-background/95 backdrop-blur-xl lg:relative lg:inset-auto">
        <div className="flex h-full flex-col overflow-y-auto">
          <div className="flex items-center justify-between border-b border-border/60 p-4">
            <h2 className="font-semibold">Review Details</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="size-4" /></Button>
          </div>

          {loading ? (
            <div className="space-y-4 p-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : detail ? (
            <div className="space-y-6 p-4">
              {/* User info */}
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  {detail.userName?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="font-medium">{detail.userName ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{detail.userReviewsCount} reviews</p>
                </div>
              </div>

              {/* Media & Rating */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">{detail.mediaType} · {detail.mediaId.slice(0, 8)}</p>
                  <p className="text-lg font-semibold text-yellow-500">{renderStars(detail.rating)}</p>
                </div>
                <div className="flex gap-1">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", detail.isHidden ? "bg-red-500/15 text-red-500" : "bg-green-500/15 text-green-500")}>
                    {detail.isHidden ? "Hidden" : "Public"}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", detail.isFeatured ? "bg-purple-500/15 text-purple-500" : "bg-muted text-muted-foreground")}>
                    {detail.isFeatured ? "Featured" : "Standard"}
                  </span>
                </div>
              </div>

              {/* Review body */}
              <div className="glass rounded-xl border border-border/60 p-4">
                <p className="whitespace-pre-wrap text-sm">{detail.body || <span className="italic text-muted-foreground">No body text</span>}</p>
              </div>

              <p className="text-xs text-muted-foreground">Created {new Date(detail.createdAt).toLocaleString()}</p>

              {/* Reports */}
              {detail.reports.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Reports ({detail.reports.length})</p>
                  <div className="space-y-2">
                    {detail.reports.map((report) => (
                      <div key={report.id} className="glass rounded-xl border border-border/60 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{report.reporterName ?? "Anonymous"}</span>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium",
                            report.status === "pending" ? "bg-yellow-500/15 text-yellow-500" :
                            report.status === "resolved" ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"
                          )}>{report.status}</span>
                        </div>
                        <p className="text-xs font-medium">{report.reason}</p>
                        {report.description && <p className="mt-0.5 text-xs text-muted-foreground">{report.description}</p>}
                        {report.status === "pending" && (
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => handleResolveReport(report.id, "resolved")}>
                              <CheckCircle className="mr-1 size-3" /> Resolve
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleResolveReport(report.id, "dismissed")}>
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
                  {detail.isHidden ? "Unhide Review" : "Hide Review"}
                </Button>
                <Button variant="destructive" className="w-full" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="mr-2 size-4" /> Delete Review
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">Failed to load review.</div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete} title="Delete Review" confirmLabel="Delete"
        description="This review will be permanently removed. This cannot be undone."
        onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} loading={actionLoading}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Admin Reviews Client
// ---------------------------------------------------------------------------

export function AdminReviewsClient() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [filter, setFilter] = useState<"all" | "hidden" | "reported">("all");
  const [sort, setSort] = useState("newest");
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadReviews = useCallback(async (p: number) => {
    setLoading(true);
    const result = await fetchReviews({
      query: searchQuery, mediaType,
      isHidden: filter === "hidden" ? true : undefined,
      isReported: filter === "reported" ? true : undefined,
      sort, page: p,
    });
    setReviews(result.items);
    setTotal(result.total);
    setPage(result.page);
    setTotalPages(result.totalPages);
    setLoading(false);
  }, [searchQuery, mediaType, filter, sort]);

  useEffect(() => { loadReviews(1); }, [loadReviews]);

  function handleSearch(value: string) {
    setSearchQuery(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadReviews(1), 300);
  }

  const renderStars = (rating: number) => "★".repeat(Math.round(rating / 2)) + "☆".repeat(5 - Math.round(rating / 2));

  return (
    <div className="relative">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search reviews..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border/60 p-0.5">
            {(["all", "hidden", "reported"] as const).map((f) => (
              <button key={f} className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition", filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")}
                onClick={() => { setFilter(f); }}>
                {f === "all" ? "All" : f === "hidden" ? "Hidden" : "Reported"}
              </button>
            ))}
          </div>

          <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
            Filters {showFilters ? <ChevronUp className="ml-1 size-3" /> : <ChevronDown className="ml-1 size-3" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={() => loadReviews(page)} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Type:</span>
              {(["", "movie", "tv", "anime"] as const).map((t) => (
                <button key={t} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition",
                    mediaType === t ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/30")}
                  onClick={() => setMediaType(t)}>
                  {t === "" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort:</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-border/60 bg-background px-2 py-1 text-xs">
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest_rated">Highest Rated</option>
                <option value="lowest_rated">Lowest Rated</option>
                <option value="most_reported">Most Reported</option>
              </select>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{total} review{total !== 1 ? "s" : ""}</p>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-border/60 glass p-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          ))
        ) : reviews.length === 0 ? (
          <div className="glass rounded-2xl border border-border/60 p-8 text-center">
            <MessageSquare className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No reviews found.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className={cn(
              "flex cursor-pointer items-center gap-4 rounded-xl border border-border/60 glass p-4 transition hover:border-primary/30",
              selectedReviewId === review.id && "border-primary/40",
            )} onClick={() => setSelectedReviewId(review.id === selectedReviewId ? null : review.id)}>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {review.userName?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{review.userName ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="uppercase">{review.mediaType}</span> · {renderStars(review.rating)} · {review.body ? review.body.slice(0, 60) + (review.body.length > 60 ? "..." : "") : <span className="italic">No text</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {review.reportCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-500">
                    <Flag className="size-3" /> {review.reportCount}
                  </span>
                )}
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium",
                  review.isHidden ? "bg-red-500/15 text-red-500" : "bg-green-500/15 text-green-500")}>
                  {review.isHidden ? "Hidden" : "Visible"}
                </span>
              </div>
              <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", selectedReviewId === review.id && "rotate-180")} />
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => loadReviews(page - 1)}>Previous</Button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => loadReviews(page + 1)}>Next</Button>
        </div>
      )}

      {selectedReviewId && (
        <div className="fixed inset-0 z-30 lg:absolute lg:inset-auto lg:left-auto lg:right-0 lg:top-0 lg:h-full">
          <ReviewDetailPanel reviewId={selectedReviewId} onClose={() => setSelectedReviewId(null)} onAction={() => loadReviews(page)} />
        </div>
      )}
    </div>
  );
}
