"use client";

/**
 * Schedule — origin: GeniusMindsCRM-Complete ("COMMUNICATION › Schedule").
 * Month calendar of gm_activities (migration 061). Click a day to
 * schedule on it; events open for editing.
 */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { GM_SELECT, useGmCanEdit, useGmRows } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { ActivityDialog } from "@/components/gm/activity-dialog";
import { ActivityRow } from "@/components/gm/activity-row";
import { GmCard, GmCardHead, GmError, GmLoading, GmPageHeader } from "@/components/gm/gm-ui";
import { toIsoDate, todayIso } from "@/lib/gm/format";
import type { GmActivity } from "@/lib/gm/types";
import { cn } from "@/lib/utils";

export default function SchedulePage() {
  const t = useTranslations("GM.schedule");
  const c = useTranslations("GM.common");
  const canEdit = useGmCanEdit();
  const { rows, loading, error, reload } = useGmRows<GmActivity>("gm_activities", {
    select: GM_SELECT.activities,
    order: "due_date",
    ascending: true,
  });
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dialog, setDialog] = useState<{ activity: GmActivity | null; date?: string } | null>(null);
  const today = todayIso();

  const cells = useMemo(() => {
    const start = month.getDay();
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, i) => {
      const n = i - start + 1;
      if (n < 1 || n > days) return null;
      const date = toIsoDate(new Date(month.getFullYear(), month.getMonth(), n));
      return { n, date, events: rows.filter((r) => r.due_date === date) };
    });
  }, [month, rows]);

  const monthEvents = rows.filter((r) => r.due_date.slice(0, 7) === toIsoDate(month).slice(0, 7));
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2026, 10, 1 + i).toLocaleDateString(undefined, { weekday: "short" }),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <GmPageHeader
        eyebrow={c("eyebrowWorkspace")}
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Button variant="outline" size="icon" aria-label={c("prev")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-36 text-center text-sm font-medium text-foreground">
              {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            <Button variant="outline" size="icon" aria-label={c("next")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {canEdit && (
              <Button onClick={() => setDialog({ activity: null })}>
                <Plus className="h-4 w-4" /> {t("add")}
              </Button>
            )}
          </>
        }
      />
      {error && <GmError message={error} />}
      {loading ? (
        <GmLoading />
      ) : (
        <>
          <GmCard className="p-0">
            <div className="grid grid-cols-7 border-b border-border text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {weekdays.map((w, i) => (
                <div key={i} className="py-2">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => (
                <div
                  key={i}
                  className={cn(
                    "min-h-24 border-b border-r border-border p-1.5 text-xs [&:nth-child(7n)]:border-r-0",
                    !cell && "bg-muted/30",
                    cell && canEdit && "cursor-pointer hover:bg-primary/5",
                  )}
                  onClick={() => cell && canEdit && setDialog({ activity: null, date: cell.date })}
                >
                  {cell && (
                    <>
                      <div
                        className={cn(
                          "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px]",
                          cell.date === today ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground",
                        )}
                      >
                        {cell.n}
                      </div>
                      <div className="space-y-1">
                        {cell.events.slice(0, 3).map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              if (canEdit) setDialog({ activity: e });
                            }}
                            className={cn(
                              "block w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-medium",
                              e.done ? "bg-muted text-muted-foreground line-through" : "bg-primary/15 text-primary",
                            )}
                          >
                            {e.due_time ? `${e.due_time.slice(0, 5)} ` : ""}
                            {e.title}
                          </button>
                        ))}
                        {cell.events.length > 3 && (
                          <div className="px-1 text-[10px] text-muted-foreground">{t("more", { count: cell.events.length - 3 })}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </GmCard>
          <GmCard className="mt-4">
            <GmCardHead title={t("monthEvents")} />
            {monthEvents.length ? (
              monthEvents.map((a) => (
                <ActivityRow key={a.id} activity={a} canEdit={canEdit} onChanged={reload} onEdit={(x) => setDialog({ activity: x })} />
              ))
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">{t("noEvents")}</p>
            )}
          </GmCard>
        </>
      )}
      {dialog && (
        <ActivityDialog
          key={dialog.activity?.id ?? `new-${dialog.date ?? ""}`}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          activity={dialog.activity}
          defaultDate={dialog.date}
          onSaved={reload}
        />
      )}
    </div>
  );
}
