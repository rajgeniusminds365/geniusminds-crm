"use client";

/**
 * Payments received — origin: GeniusMindsCRM-Complete
 * ("COMMERCE › Payments received"). Table gm_payments (migration 062).
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BookOpen, Download, IndianRupee, Pencil, Plus, ReceiptText, Trash2, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GM_SELECT, useGmCanEdit, useGmRows } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { PaymentDialog } from "@/components/gm/payment-dialog";
import { GmCard, GmCardHead, GmEmpty, GmError, GmLoading, GmPageHeader, GmPerson, GmPill, GmStatCard, GmTable, GmTd } from "@/components/gm/gm-ui";
import { GmPager, usePaged } from "@/components/gm/pager";
import { downloadCsv, toCsv } from "@/lib/gm/csv";
import { formatDay, formatMoney, todayIso } from "@/lib/gm/format";
import { inMonth, receivedTotal } from "@/lib/gm/insights";
import type { GmPayment } from "@/lib/gm/types";

const TONE = { received: "green", pending: "amber", refunded: "red" } as const;

export default function PaymentsPage() {
  const t = useTranslations("GM.payments");
  const c = useTranslations("GM.common");
  const canEdit = useGmCanEdit();
  const { rows, loading, error, reload } = useGmRows<GmPayment>("gm_payments", { select: GM_SELECT.payments, order: "paid_on" });
  const [dialog, setDialog] = useState<{ payment: GmPayment | null } | null>(null);
  const paged = usePaged(rows, 25);

  const received = rows.filter((p) => p.status === "received");
  const total = receivedTotal(rows);
  const thisMonth = receivedTotal(rows.filter((p) => inMonth(p.paid_on, new Date())));
  const courseCount = new Set(received.map((p) => p.course_id).filter(Boolean)).size;

  function exportCsv() {
    downloadCsv(
      `payments-${todayIso()}.csv`,
      toCsv(
        ["Learner", "Course", "Amount", "Currency", "Date", "Method", "Reference", "Status"],
        rows.map((p) => [p.payer_name, p.course?.name ?? "", p.amount, p.currency, p.paid_on, p.method, p.reference, p.status]),
      ),
    );
  }

  async function remove(p: GmPayment) {
    if (!confirm(c("confirmDelete"))) return;
    const { error: err } = await createClient().from("gm_payments").delete().eq("id", p.id);
    if (err) toast.error(err.message);
    else {
      toast.success(c("deleted"));
      reload();
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <GmPageHeader
        eyebrow={c("eyebrowWorkspace")}
        title={t("title")}
        description={t("description")}
        actions={canEdit && (
          <Button onClick={() => setDialog({ payment: null })}>
            <Plus className="h-4 w-4" /> {t("add")}
          </Button>
        )}
      />
      {error && <GmError message={error} />}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GmStatCard label={t("statTotal")} value={formatMoney(total)} hint={t("statTotalHint", { amount: formatMoney(thisMonth) })} icon={IndianRupee} />
        <GmStatCard label={t("statCount")} value={received.length} hint={t("statCountHint")} icon={ReceiptText} />
        <GmStatCard label={t("statAverage")} value={formatMoney(received.length ? total / received.length : 0)} hint={t("statAverageHint")} icon={TrendingUp} />
        <GmStatCard label={t("statCourses")} value={courseCount} hint={t("statCoursesHint")} icon={BookOpen} />
      </div>
      <GmCard>
        <GmCardHead
          title={t("recent")}
          action={<Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}><Download className="h-3.5 w-3.5" /> {c("export")}</Button>}
        />
        {loading ? (
          <GmLoading />
        ) : (
          <GmTable
            head={[t("colLearner"), t("colCourse"), t("colAmount"), t("colDate"), t("colMethod"), t("colStatus"), ""]}
            empty={!rows.length && <GmEmpty title={c("noRecords")} body={t("empty")} />}
          >
            {paged.items.map((p) => (
              <tr key={p.id}>
                <GmTd><GmPerson name={p.payer_name} sub={p.reference || undefined} /></GmTd>
                <GmTd>{p.course?.name ?? "—"}</GmTd>
                <GmTd className="font-semibold">{formatMoney(p.amount, p.currency)}</GmTd>
                <GmTd>{formatDay(p.paid_on)}</GmTd>
                <GmTd>{p.method || "—"}</GmTd>
                <GmTd><GmPill tone={TONE[p.status]}>{t(`status.${p.status}`)}</GmPill></GmTd>
                <GmTd className="text-right">
                  {canEdit && (
                    <div className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" aria-label={c("edit")} onClick={() => setDialog({ payment: p })}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label={c("delete")} onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  )}
                </GmTd>
              </tr>
            ))}
          </GmTable>
        )}
        <GmPager {...paged} />
      </GmCard>
      {dialog && <PaymentDialog payment={dialog.payment} onClose={() => setDialog(null)} onSaved={reload} />}
    </div>
  );
}
