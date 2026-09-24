import Link from "next/link";
import { Sparkles } from "lucide-react";

import { NAV_ITEMS } from "./nav-items";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border/60">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm space-y-2">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <Sparkles className="size-5 text-primary" />
              <span className="text-gradient text-lg">StreamVerse</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Your AI-powered entertainment discovery assistant. We help you
              decide what to watch — every &quot;watch&quot; link points to an
              official provider.
            </p>
          </div>

          <nav className="flex flex-col gap-2" aria-label="Footer">
            <span className="text-sm font-semibold">Discover</span>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} StreamVerse. All rights reserved.</p>
          <p>
            Metadata by{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              TMDB
            </a>
            . This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </p>
        </div>
      </div>
    </footer>
  );
}
