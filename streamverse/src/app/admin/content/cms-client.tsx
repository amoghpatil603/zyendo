"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Clapperboard, Image, Star, Layout, BookOpen, Plus, Trash2,
  Eye, EyeOff, X, ToggleLeft, ToggleRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import type {
  CmsStats, HeroBanner, FeaturedContentItem,
  EditorialCollection, HomepageSection,
} from "@/lib/admin/content-management";

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: Clapperboard },
  { key: "banners", label: "Hero Banners", icon: Image },
  { key: "featured", label: "Featured Content", icon: Star },
  { key: "editorial", label: "Editorial Collections", icon: BookOpen },
  { key: "sections", label: "Homepage Sections", icon: Layout },
];

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-2xl border border-border/60 p-4">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero Banner Manager
// ---------------------------------------------------------------------------

function BannerManager({ banners, onRefresh }: { banners: HeroBanner[]; onRefresh: () => void }) {
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function handleDelete(id: string) {
    const mod = await import("@/lib/admin/content-management");
    const r = await mod.deleteHeroBanner(id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Banner deleted"); onRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{banners.length} banner{banners.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => { setEditingBanner(null); setShowForm(true); }}>
          <Plus className="mr-1 size-3" /> Add Banner
        </Button>
      </div>

      {banners.length === 0 ? (
        <EmptyState icon={Image} title="No banners" description="Add a hero banner to feature on the homepage." />
      ) : (
        <div className="space-y-2">
          {banners.map((b) => (
            <div key={b.id} className="glass flex items-center gap-4 rounded-xl border border-border/60 p-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 text-xs text-muted-foreground">
                {b.backdropUrl ? <img src={b.backdropUrl} alt="" className="h-full w-full rounded-lg object-cover" /> : <Image className="size-6" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{b.title}</p>
                <p className="text-xs text-muted-foreground">Order {b.sortOrder} · {b.isActive ? "Active" : "Inactive"}</p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", b.isActive ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground")}>
                {b.isActive ? "Active" : "Inactive"}
              </span>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Featured Content Manager
// ---------------------------------------------------------------------------

function FeaturedManager({ items, onRefresh }: { items: FeaturedContentItem[]; onRefresh: () => void }) {
  const [mediaType, setMediaType] = useState("movie");
  const [mediaId, setMediaId] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!mediaId.trim()) return;
    setAdding(true);
    const mod = await import("@/lib/admin/content-management");
    const r = await mod.addFeaturedContent(mediaType, mediaId.trim());
    setAdding(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Added"); setMediaId(""); onRefresh();
  }

  async function handleRemove(id: string) {
    const mod = await import("@/lib/admin/content-management");
    const r = await mod.removeFeaturedContent(id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Removed"); onRefresh();
  }

  const filtered = items.filter((i) => i.mediaType === mediaType);
  const typeLabels = { movie: "Movies", tv: "TV Shows", anime: "Anime" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["movie", "tv", "anime"] as const).map((t) => (
          <button key={t} className={cn("rounded-full border px-4 py-1.5 text-xs font-medium transition",
            mediaType === t ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground")}
            onClick={() => setMediaType(t)}>
            {typeLabels[t]} ({items.filter((i) => i.mediaType === t).length})
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input placeholder="TMDB ID (e.g. 550)" value={mediaId} onChange={(e) => setMediaId(e.target.value)} className="max-w-xs" />
        <Button size="sm" onClick={handleAdd} disabled={adding || !mediaId.trim()}>
          <Plus className="mr-1 size-3" /> Add
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Star} title={`No featured ${typeLabels[mediaType as keyof typeof typeLabels]}`} description="Add content by TMDB ID to feature it." />
      ) : (
        <div className="space-y-1">
          {filtered.map((f, i) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-border/60 glass px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
                <span className="text-sm font-medium">{f.mediaId.slice(0, 10)}</span>
                {f.label && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{f.label}</span>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleRemove(f.id)}><X className="size-3 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editorial Collections Manager
// ---------------------------------------------------------------------------

function EditorialManager({ collections, onRefresh }: { collections: EditorialCollection[]; onRefresh: () => void }) {
  async function handleToggle(id: string, published: boolean) {
    const mod = await import("@/lib/admin/content-management");
    const r = await mod.upsertEditorialCollection({ id, title: "", slug: "", isPublished: !published });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(published ? "Unpublished" : "Published"); onRefresh();
  }

  async function handleDelete(id: string) {
    const mod = await import("@/lib/admin/content-management");
    const r = await mod.deleteEditorialCollection(id);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Deleted"); onRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{collections.length} collection{collections.length !== 1 ? "s" : ""}</p>
        <Button size="sm"><Plus className="mr-1 size-3" /> New Collection</Button>
      </div>

      {collections.length === 0 ? (
        <EmptyState icon={BookOpen} title="No editorial collections" description="Create curated lists like 'Top Horror Movies' or 'Oscar Winners'." />
      ) : (
        <div className="space-y-2">
          {collections.map((c) => (
            <div key={c.id} className="glass flex items-center gap-4 rounded-xl border border-border/60 p-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                {c.coverImageUrl ? <img src={c.coverImageUrl} alt="" className="h-full w-full rounded-xl object-cover" /> : <BookOpen className="size-5 text-primary/40" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.itemCount} items · {c.isPublished ? "Published" : "Draft"}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleToggle(c.id, c.isPublished)}>
                {c.isPublished ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Homepage Sections Manager
// ---------------------------------------------------------------------------

function SectionsManager({ sections, onRefresh }: { sections: HomepageSection[]; onRefresh: () => void }) {
  async function handleToggle(id: string, current: boolean) {
    const mod = await import("@/lib/admin/content-management");
    const r = await mod.toggleHomepageSection(id, !current);
    if (!r.ok) { toast.error(r.error); return; }
    onRefresh();
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Enable or disable sections on the homepage</p>
      {sections.map((s) => (
        <div key={s.id} className="glass flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
          <div>
            <p className="text-sm font-medium">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.sectionKey} · Order {s.sortOrder}</p>
          </div>
          <button onClick={() => handleToggle(s.id, s.isEnabled)} className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition",
            s.isEnabled ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground",
          )}>
            {s.isEnabled ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
            {s.isEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main CMS Client
// ---------------------------------------------------------------------------

export function CmsClient({ stats, initialBanners, initialFeatured, initialEditorial, initialSections }: {
  stats: CmsStats;
  initialBanners: HeroBanner[];
  initialFeatured: FeaturedContentItem[];
  initialEditorial: EditorialCollection[];
  initialSections: HomepageSection[];
}) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [banners, setBanners] = useState(initialBanners);
  const [featured, setFeatured] = useState(initialFeatured);
  const [editorial, setEditorial] = useState(initialEditorial);
  const [sections, setSections] = useState(initialSections);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function refresh(tab: string) {
    setLoading((l) => ({ ...l, [tab]: true }));
    try {
      const mod = await import("@/lib/admin/content-management");
      switch (tab) {
        case "banners": setBanners(await mod.getHeroBanners()); break;
        case "featured": setFeatured(await mod.getFeaturedContent()); break;
        case "editorial": setEditorial(await mod.getEditorialCollections()); break;
        case "sections": setSections(await mod.getHomepageSections()); break;
      }
    } finally {
      setLoading((l) => ({ ...l, [tab]: false }));
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
          <Clapperboard className="size-6 text-primary" />
          Content Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage featured content, hero banners, editorial collections, and homepage sections
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-border/60 glass p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
              activeTab === tab.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
            )} onClick={() => setActiveTab(tab.key)}>
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Featured Movies" value={stats.featuredMovies} />
            <StatCard label="Featured TV Shows" value={stats.featuredTv} />
            <StatCard label="Featured Anime" value={stats.featuredAnime} />
            <StatCard label="Editorial Collections" value={stats.editorialCollections} />
            <StatCard label="Hero Banners" value={stats.heroBanners} />
            <StatCard label="Homepage Sections" value={stats.homepageSections} />
          </div>
          <div className="glass rounded-2xl border border-border/60 p-6">
            <p className="text-sm font-semibold mb-2">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {TABS.filter((t) => t.key !== "dashboard").map((t) => {
                const Icon = t.icon;
                return (
                  <Button key={t.key} variant="secondary" size="sm" onClick={() => setActiveTab(t.key)}>
                    <Icon className="mr-1 size-3" /> Manage {t.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Banners Tab */}
      {activeTab === "banners" && (
        <div className="relative">
          {loading.banners && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-2xl"><RefreshCw className="size-6 animate-spin text-primary" /></div>}
          <BannerManager banners={banners} onRefresh={() => refresh("banners")} />
        </div>
      )}

      {/* Featured Tab */}
      {activeTab === "featured" && (
        <div className="relative">
          {loading.featured && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-2xl"><RefreshCw className="size-6 animate-spin text-primary" /></div>}
          <FeaturedManager items={featured} onRefresh={() => refresh("featured")} />
        </div>
      )}

      {/* Editorial Tab */}
      {activeTab === "editorial" && (
        <div className="relative">
          {loading.editorial && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-2xl"><RefreshCw className="size-6 animate-spin text-primary" /></div>}
          <EditorialManager collections={editorial} onRefresh={() => refresh("editorial")} />
        </div>
      )}

      {/* Sections Tab */}
      {activeTab === "sections" && (
        <div className="relative">
          {loading.sections && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-2xl"><RefreshCw className="size-6 animate-spin text-primary" /></div>}
          <SectionsManager sections={sections} onRefresh={() => refresh("sections")} />
        </div>
      )}
    </div>
  );
}
