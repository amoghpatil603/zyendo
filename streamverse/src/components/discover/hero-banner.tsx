"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MediaItem } from "@/types/media-item";

interface HeroBanner {
  id: string;
  title: string;
  subtitle: string | null;
  backdropUrl: string | null;
  overlayColor: string;
  ctaLabel: string;
  ctaHref: string | null;
  sortOrder: number;
  media: MediaItem | null;
}

function BannerSkeleton() {
  return (
    <div className="relative aspect-[16/7] w-full overflow-hidden rounded-xl sm:aspect-[21/9]">
      <Skeleton className="h-full w-full" />
      <div className="absolute bottom-0 left-0 p-4 sm:p-6 space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

export function HeroBanner() {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/lib/discovery/cms-resolver");
      const data = await mod.getResolvedHeroBanners();
      setBanners(data);
    } catch {
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-advance banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((i) => (i + 1) % banners.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Don't render if no banners
  if (!loading && banners.length === 0) {
    return null;
  }

  const activeBanner = banners[activeIndex];

  function goTo(index: number) {
    setActiveIndex(index);
  }

  function scrollBy(direction: 1 | -1) {
    if (banners.length <= 1) return;
    setActiveIndex((i) => (i + direction + banners.length) % banners.length);
  }

  return (
    <section className="relative">
      {loading ? (
        <BannerSkeleton />
      ) : (
        <>
          {/* Banner Image */}
          <div className="relative aspect-[16/7] w-full overflow-hidden rounded-xl sm:aspect-[21/9]">
            {activeBanner?.backdropUrl ? (
              <img
                src={activeBanner.backdropUrl}
                alt={activeBanner.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-primary/20 to-primary/5" />
            )}

            {/* Overlay */}
            <div
              className="absolute inset-0"
              style={{ backgroundColor: activeBanner?.overlayColor ?? "rgba(0,0,0,0.5)" }}
            />

            {/* Content */}
            <div className="absolute bottom-0 left-0 p-4 sm:p-6 max-w-2xl">
              <h2 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                {activeBanner?.title}
              </h2>
              {activeBanner?.subtitle && (
                <p className="mt-2 text-sm text-white/80 sm:text-base line-clamp-2">
                  {activeBanner.subtitle}
                </p>
              )}
              {activeBanner?.ctaHref && (
                <Button
                  asChild
                  size="sm"
                  className="mt-4 gap-1.5"
                >
                  <a href={activeBanner.ctaHref}>
                    <Play className="size-3.5" />
                    {activeBanner.ctaLabel}
                  </a>
                </Button>
              )}
            </div>

            {/* Navigation arrows */}
            {banners.length > 1 && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="Previous banner"
                  onClick={() => scrollBy(-1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-8 rounded-full opacity-0 transition group-hover/carousel:opacity-100 md:flex"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="Next banner"
                  onClick={() => scrollBy(1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-8 rounded-full opacity-0 transition group-hover/carousel:opacity-100 md:flex"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </>
            )}
          </div>

          {/* Dots indicator */}
          {banners.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-1.5 w-6 rounded-full transition ${
                    i === activeIndex ? "bg-primary" : "bg-border hover:bg-border/80"
                  }`}
                  aria-label={`Go to banner ${i + 1}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}