"use client";

/**
 * Fee management — origin: GeniusMindsCRM-Complete
 * ("EDUCATION › Fee management"). For each enrolled learner: course
 * fee vs payments received (gm_payments), balance and a one-click
 * "Record payment".
 */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, IndianRupee, Wallet } from "lucide-react";
import { GM_SELECT, useGmCanEdit, useGmRows } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentDialog } from "@/components/gm/payment-dialog";
import { GmCard, GmEmpty, GmError, GmFilterChips, GmLoading, GmPageHeader, GmPerson, GmPill, GmStatCard, GmTable, GmTd } from "@/components/gm/gm-ui";
import { GmPager, usePaged } from "@/components/gm/pager";
import { formatDay, formatMoney } from "@/lib/gm/format";
import { feeLines, leadName, type FeeLine } from "@/lib/gm/insights";
import type { GmLeadProfile, GmPayment } from "@/lib/gm/types";

const TONE = { paid: "green", partial: "amber", unpaid: "red", no_course: "muted" } as const;

export default function FeesPage() {
  const t = useTranslations("GM.fees");
  const c = useTranslations("GM.common");
  const canEdit = useGmCanEdit();
  const leads = useGmRows<GmLeadProfile>("gm_lead_profiles", { select: GM_SELECT.leads, eq: { lead_status: "enrolled" } });
  const payments = useGmRows<GmPayment>("gm_payments", { select: GM_SELECT.payments, order: "paid_on" });
  const [filter, setFilter] = useState<"all" | FeeLine["state"]>("all");
  const [q, setQ] = useState("");
  const [pay, setPay] = useState<FeeLine | null>(null);

  const lines = useMemo(() => feeLines(leads.rows, payments.rows), [leads.rows, payments.rows]);
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return lines
      .filter((l) => filter === "all" || l.state === filter)
      .filter((l) => !term || leadName(l.lead).toLowerCase().includes(term) || (l.lead.course?.name ?? "").toLowerCase().includes(term));
  }, [lines, filter, q]);
  const paged = usePaged(visible, 25);
  const due = lines.reduce((s, l) => s + l.balance, 0);
  const collected = lines.reduce((s, l) => s + l.paid, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <GmPageHeader eyebrow={c("eyebrowWorkspace")} title={t("title")} description={t("description")} />
      {(leads.error || payments.error) && <GmError message={(leads.error || payments.error)!} />}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GmStatCard label={t("statCollected")} value={formatMoney(collected)} hint={t("statCollectedHint")} icon={IndianRupee} />
        <GmStatCard label={t("statDue")} value={formatMoney(due)} hint={t("statDueHint")} icon={Wallet} />
        <GmStatCard label={t("statPaid")} value={lines.filter((l) => l.state === "paid").length} hint={t("statPaidHint")} icon={CheckCircle2} />
        <GmStatCard label={t("statOutstanding")} value={lines.filter((l) => l.state === "partial" || l.state === "unpaid").length} hint={t("statOutstandingHint")} icon={AlertCircle} />
      </div>
      <GmFilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: c("all") },
          { value: "unpaid", label: t("state.unpaid") },
          { value: "partial", label: t("state.partial") },
          { value: "paid", label: t("state.paid") },
          { value: "no_course", label: t("state.no_course") },
        ]}
      />
      <GmCard>
        <div className="mb-3"><Input className="max-w-xs" placeholder={c("search")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {leads.loading || payments.loading ? (
          <GmLoading />
        ) : (
          <GmTable
            head={[t("colLearner"), t("colCourse"), t("colFee"), t("colPaid"), t("colBalance"), t("colStatus"), t("colLast"), ""]}
            empty={!visible.length && <GmEmpty title={c("noRecords")} body={t("empty")} />}
          >
            {paged.items.map((l) => (
              <tr key={l.lead.id}>
                <GmTd><GmPerson name={leadName(l.lead)} sub={l.lead.contact?.phone} /></GmTd>
                <GmTd>{l.lead.course?.name ?? "—"}</GmTd>
                <GmTd>{l.lead.course ? formatMoney(l.fee, l.lead.course.currency) : "—"}</GmTd>
                <GmTd>{formatMoney(l.paid, l.lead.course?.currency)}</GmTd>
                <GmTd className="font-semibold">{formatMoney(l.balance, l.lead.course?.currency)}</GmTd>
                <GmTd><GmPill tone={TONE[l.state]}>{t(`state.${l.state}`)}</GmPill></GmTd>
                <GmTd>{l.lastPayment ? `${formatMoney(l.lastPayment.amount, l.lastPayment.currency)} · ${formatDay(l.lastPayment.paid_on)}` : "—"}</GmTd>
                <GmTd className="text-right">
                  {canEdit && (
                    <Button size="sm" variant="outline" onClick={() => setPay(l)}>{t("recordPayment")}</Button>
                  )}
                </GmTd>
              </tr>
            ))}
          </GmTable>
        )}
        <GmPager {...paged} />
      </GmCard>
      {pay && (
        <PaymentDialog
          presetContact={pay.lead.contact ?? null}
          presetCourseId={pay.lead.course_id}
          presetAmount={pay.balance || undefined}
          onClose={() => setPay(null)}
          onSaved={payments.reload}
        />
      )}
    </div>
  );
}
