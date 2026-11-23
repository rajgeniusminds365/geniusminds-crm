"use client";

/**
 * Intelligence — origin: GeniusMindsCRM-Complete
 * ("INTELLIGENCE › Intelligence"). GM had only a placeholder here; this
 * page shows the CRM signals GM's assistant already computed (follow-
 * ups due / overdue / upcoming, money in vs out, pending reviews), as
 * live cards. No new logic beyond GM's own rules.
 */
import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangle, CalendarCheck, CalendarClock, Clock, IndianRupee, Receipt } from "lucide-react";
import { useGmSnapshot } from "@/hooks/use-gm-data";
import { useContactSheet } from "@/components/gm/contact-sheet";
import { GmCard, GmCardHead, GmError, GmLoading, GmPageHeader, GmPerson, GmStatCard } from "@/components/gm/gm-ui";
import { formatDay, formatMoney, todayIso } from "@/lib/gm/format";
import { followUps, inMonth, leadName, receivedTotal, sumAmounts } from "@/lib/gm/insights";
import type { GmLeadProfile } from "@/lib/gm/types";

export default function IntelligencePage() {
  const t = useTranslations("GM.intelligence");
  const s = useTranslations("GM.lead.status");
  const { data, loading, error, reload } = useGmSnapshot();
  const { openContact, sheet } = useContactSheet(() => void reload());
  const today = todayIso();
  const fu = useMemo(() => followUps(data.leads, today), [data.leads, today]);
  const now = new Date();
  const inThisMonth = receivedTotal(data.payments.filter((p) => inMonth(p.paid_on, now)));
  const spentThisMonth = sumAmounts(data.expenses.filter((e) => e.status !== "rejected" && inMonth(e.spent_on, now)));
  const openActivities = data.activities.filter((a) => !a.done && a.due_date <= today).length;

  const list = (items: GmLeadProfile[], empty: string) =>
    items.length ? (
      items.slice(0, 10).map((l) => (
        <button key={l.id} type="button" onClick={() => openContact(l.contact_id)} className="flex w-full items-center justify-between gap-3 border-b border-border py-2 text-left last:border-0 hover:bg-muted/50">
          <GmPerson name={leadName(l)} sub={`${s(l.lead_status)}${l.course ? ` · ${l.course.name}` : ""}`} />
          <span className="shrink-0 text-xs text-muted-foreground">{formatDay(l.follow_up_date)}</span>
        </button>
      ))
    ) : (
      <p className="py-6 text-center text-xs text-muted-foreground">{empty}</p>
    );

  return (
    <div className="mx-auto max-w-6xl">
      <GmPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      {error && <GmError message={error} />}
      {loading ? (
        <GmLoading />
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <GmStatCard label={t("statOverdue")} value={fu.overdue.length} hint={t("statOverdueHint")} icon={AlertTriangle} />
            <GmStatCard label={t("statActivities")} value={openActivities} hint={t("statActivitiesHint")} icon={Clock} />
            <GmStatCard label={t("statIn")} value={formatMoney(inThisMonth)} hint={t("statInHint")} icon={IndianRupee} />
            <GmStatCard label={t("statOut")} value={formatMoney(spentThisMonth)} hint={t("statOutHint", { count: data.expenses.filter((e) => e.status === "pending").length })} icon={Receipt} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <GmCard>
              <GmCardHead title={t("overdue")} action={<AlertTriangle className="h-4 w-4 text-red-500" />} />
              {list(fu.overdue, t("noneOverdue"))}
            </GmCard>
            <GmCard>
              <GmCardHead title={t("dueToday")} action={<CalendarCheck className="h-4 w-4 text-primary" />} />
              {list(fu.dueToday, t("noneToday"))}
            </GmCard>
            <GmCard>
              <GmCardHead title={t("upcoming")} action={<CalendarClock className="h-4 w-4 text-muted-foreground" />} />
              {list(fu.upcoming, t("noneUpcoming"))}
            </GmCard>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("askHint")} <Link href="/assistant" className="font-medium text-primary hover:underline">{t("askLink")}</Link>
          </p>
        </>
      )}
      {sheet}
    </div>
  );
}
