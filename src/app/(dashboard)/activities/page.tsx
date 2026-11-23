"use client";

/**
 * Activities — origin: GeniusMindsCRM-Complete ("WORKSPACE › Activities").
 * Rebuilt on wacrm: Supabase table gm_activities (migration 061),
 * realtime refresh, role-gated writes.
 */
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { GM_SELECT, useGmCanEdit, useGmRows } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { ActivityDialog } from "@/components/gm/activity-dialog";
import { ActivityRow } from "@/components/gm/activity-row";
import { GmCard, GmCardHead, GmError, GmLoading, GmPageHeader, GmPill } from "@/components/gm/gm-ui";
import { formatDay, todayIso } from "@/lib/gm/format";
import type { GmActivity } from "@/lib/gm/types";

export default function ActivitiesPage() {
  const t = useTranslations("GM.activities");
  const c = useTranslations("GM.common");
  const canEdit = useGmCanEdit();
  const { rows, loading, error, reload } = useGmRows<GmActivity>("gm_activities", {
    select: GM_SELECT.activities,
    order: "due_date",
    ascending: true,
  });
  const [editing, setEditing] = useState<GmActivity | null>(null);
  const [open, setOpen] = useState(false);
  const today = todayIso();

  const todays = rows.filter((a) => a.due_date === today);
  const overdue = rows.filter((a) => a.due_date < today && !a.done);
  const upcoming = rows.filter((a) => a.due_date > today);

  const list = (items: GmActivity[], emptyText: string) =>
    items.length ? (
      items.map((a) => (
        <ActivityRow key={a.id} activity={a} canEdit={canEdit} onChanged={reload} onEdit={(x) => { setEditing(x); setOpen(true); }} />
      ))
    ) : (
      <p className="py-6 text-center text-xs text-muted-foreground">{emptyText}</p>
    );

  return (
    <div className="mx-auto max-w-6xl">
      <GmPageHeader
        eyebrow={c("eyebrowWorkspace")}
        title={t("title")}
        description={t("description")}
        actions={
          canEdit && (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" /> {t("add")}
            </Button>
          )
        }
      />
      {error && <GmError message={error} />}
      {loading ? (
        <GmLoading />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <GmCard>
            <GmCardHead title={t("today")} description={formatDay(today)} action={<GmPill tone="green">{t("todayBadge")}</GmPill>} />
            {list(todays, t("noneToday"))}
          </GmCard>
          <GmCard>
            <GmCardHead
              title={t("upcoming")}
              description={t("upcomingSub")}
              action={<Link href="/schedule" className="text-xs font-medium text-primary hover:underline">{t("openCalendar")} →</Link>}
            />
            {list(upcoming, t("noneUpcoming"))}
          </GmCard>
          <GmCard className="lg:col-span-2">
            <GmCardHead title={t("overdue")} />
            {list(overdue, t("noneOverdue"))}
          </GmCard>
        </div>
      )}
      {open && (
        <ActivityDialog key={editing?.id ?? "new"} open={open} onOpenChange={setOpen} activity={editing} onSaved={reload} />
      )}
    </div>
  );
}
