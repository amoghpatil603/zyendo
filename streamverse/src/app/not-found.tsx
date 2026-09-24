import Link from "next/link";
import { Compass } from "lucide-react";

import { PageContainer } from "@/components/common/page-container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageContainer className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="rounded-full bg-primary/10 p-4 text-primary">
        <Compass className="size-8" />
      </div>
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="max-w-md text-muted-foreground">
        We couldn&apos;t find what you were looking for. It may have moved, or
        the title isn&apos;t in our catalog.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/movies">Browse movies</Link>
        </Button>
      </div>
    </PageContainer>
  );
}
