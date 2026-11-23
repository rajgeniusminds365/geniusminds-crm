"use client";

/** Client-side paging (GM paged its lead tables 25 rows at a time). */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function usePaged<T>(items: T[], size: number) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  return {
    items: items.slice((current - 1) * size, current * size),
    page: current,
    pages,
    setPage,
  };
}

export function GmPager({ page, pages, setPage }: { page: number; pages: number; setPage: (p: number) => void }) {
  const c = useTranslations("GM.common");
  if (pages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
        {c("prev")}
      </Button>
      {c("pageOf", { page, pages })}
      <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
        {c("next")}
      </Button>
    </div>
  );
}
