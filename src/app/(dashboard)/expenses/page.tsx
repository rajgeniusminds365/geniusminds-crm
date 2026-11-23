"use client";

/**
 * Expenses — origin: GeniusMindsCRM-Complete ("COMMERCE › Expenses").
 * Table gm_expenses (migration 062). Agents record expenses; admins
 * approve or reject them (enforced by RLS, mirrored in the UI).
 */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Clock, Download, IndianRupee, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGmCanEdit, useGmIsAdmin, useGmRows } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GmFormDialog } from "@/components/gm/form-dialog";
import { GmCard, GmEmpty, GmError, GmField, GmFilterChips, GmLoading, GmPageHeader, GmPill, GmSelect, GmStatCard, GmTable, GmTd } from "@/components/gm/gm-ui";
import { CURRENCIES } from "@/lib/currency";
import { downloadCsv, toCsv } from "@/lib/gm/csv";
import { formatDay, formatMoney, todayIso } from "@/lib/gm/format";
import { inMonth, sumAmounts } from "@/lib/gm/insights";
import { GM_DEFAULT_CURRENCY, type ExpenseStatus, type GmExpense } from "@/lib/gm/types";

const TONE = { pending: "amber", approved: "green", rejected: "red" } as const;

function ExpenseDialog({ expense, onClose, onSaved }: { expense: GmExpense | null; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations("GM.expenses");
  const { accountId } = useAuth();
  const [title, setTitle] = useState(expense?.title ?? "");
  const [category, setCategory] = useState(expense?.category ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [currency, setCurrency] = useState(expense?.currency ?? GM_DEFAULT_CURRENCY);
  const [date, setDate] = useState(expense?.spent_on ?? todayIso());
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!accountId) return;
    if (!title.trim()) return void toast.error(t("titleRequired"));
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) return void toast.error(t("amountInvalid"));
    setBusy(true);
    const payload = { account_id: accountId, title: title.trim(), category: category.trim(), amount: amt, currency, spent_on: date };
    const db = createClient();
    const { error } = expense
      ? await db.from("gm_expenses").update(payload).eq("id", expense.id)
      : await db.from("gm_expenses").insert(payload);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(t("saved"));
    onClose();
    onSaved();
  }

  return (
    <GmFormDialog open onOpenChange={(o) => !o && onClose()} title={expense ? t("editTitle") : t("addTitle")} busy={busy} onSubmit={save}>
      <GmField label={t("fieldTitle")} wide><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></GmField>
      <GmField label={t("fieldCategory")}><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("categoryHint")} /></GmField>
      <GmField label={t("fieldDate")}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></GmField>
      <GmField label={t("fieldAmount")}><Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></GmField>
      <GmField label={t("fieldCurrency")}><GmSelect value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c.code, label: c.code }))} /></GmField>
    </GmFormDialog>
  );
}

export default function ExpensesPage() {
  const t = useTranslations("GM.expenses");
  const c = useTranslations("GM.common");
  const canEdit = useGmCanEdit();
  const isAdmin = useGmIsAdmin();
  const { user } = useAuth();
  const { rows, loading, error, reload } = useGmRows<GmExpense>("gm_expenses", { order: "spent_on" });
  const [filter, setFilter] = useState<"all" | ExpenseStatus>("all");
  const [dialog, setDialog] = useState<{ expense: GmExpense | null } | null>(null);
  const visible = useMemo(() => (filter === "all" ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);

  async function review(e: GmExpense, status: ExpenseStatus) {
    const { error: err } = await createClient().from("gm_expenses").update({ status, reviewed_by: user?.id ?? null }).eq("id", e.id);
    if (err) toast.error(err.message);
    else reload();
  }
  async function remove(e: GmExpense) {
    if (!confirm(c("confirmDelete"))) return;
    const { error: err } = await createClient().from("gm_expenses").delete().eq("id", e.id);
    if (err) toast.error(err.message);
    else {
      toast.success(c("deleted"));
      reload();
    }
  }
  function exportCsv() {
    downloadCsv(`expenses-${todayIso()}.csv`, toCsv(["Expense", "Category", "Amount", "Currency", "Date", "Status"], visible.map((e) => [e.title, e.category, e.amount, e.currency, e.spent_on, e.status])));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <GmPageHeader
        eyebrow={c("eyebrowWorkspace")}
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!visible.length}><Download className="h-4 w-4" /> {c("export")}</Button>
            {canEdit && <Button onClick={() => setDialog({ expense: null })}><Plus className="h-4 w-4" /> {t("add")}</Button>}
          </>
        }
      />
      {error && <GmError message={error} />}
      <GmFilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: t("filterAll") },
          { value: "pending", label: t("status.pending") },
          { value: "approved", label: t("status.approved") },
          { value: "rejected", label: t("status.rejected") },
        ]}
      />
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GmStatCard label={t("statTotal")} value={formatMoney(sumAmounts(rows.filter((r) => r.status !== "rejected")))} hint={t("statTotalHint", { amount: formatMoney(sumAmounts(rows.filter((r) => r.status !== "rejected" && inMonth(r.spent_on, new Date())))) })} icon={IndianRupee} />
        <GmStatCard label={t("statPending")} value={rows.filter((r) => r.status === "pending").length} hint={t("statPendingHint")} icon={Clock} />
        <GmStatCard label={t("statApproved")} value={rows.filter((r) => r.status === "approved").length} hint={t("statApprovedHint")} icon={Check} />
        <GmStatCard label={t("statCategories")} value={new Set(rows.map((r) => r.category).filter(Boolean)).size} hint={t("statCategoriesHint")} icon={Layers} />
      </div>
      <GmCard>
        {loading ? (
          <GmLoading />
        ) : (
          <GmTable head={[t("colExpense"), t("colCategory"), t("colAmount"), t("colDate"), t("colStatus"), ""]} empty={!visible.length && <GmEmpty title={c("noRecords")} body={c("noRecordsBody")} />}>
            {visible.map((e) => (
              <tr key={e.id}>
                <GmTd className="font-medium">{e.title}</GmTd>
                <GmTd>{e.category || "—"}</GmTd>
                <GmTd className="font-semibold">{formatMoney(e.amount, e.currency)}</GmTd>
                <GmTd>{formatDay(e.spent_on)}</GmTd>
                <GmTd><GmPill tone={TONE[e.status]}>{t(`status.${e.status}`)}</GmPill></GmTd>
                <GmTd className="text-right">
                  <div className="flex justify-end gap-1">
                    {isAdmin && e.status !== "approved" && (
                      <Button size="icon-sm" variant="ghost" aria-label={t("approve")} title={t("approve")} onClick={() => review(e, "approved")}><Check className="h-3.5 w-3.5" /></Button>
                    )}
                    {isAdmin && e.status !== "rejected" && (
                      <Button size="icon-sm" variant="ghost" aria-label={t("reject")} title={t("reject")} onClick={() => review(e, "rejected")}><X className="h-3.5 w-3.5" /></Button>
                    )}
                    {isAdmin && (
                      <Button size="icon-sm" variant="ghost" aria-label={c("edit")} onClick={() => setDialog({ expense: e })}><Pencil className="h-3.5 w-3.5" /></Button>
                    )}
                    {canEdit && (
                      <Button size="icon-sm" variant="ghost" aria-label={c("delete")} onClick={() => remove(e)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    )}
                  </div>
                </GmTd>
              </tr>
            ))}
          </GmTable>
        )}
      </GmCard>
      {dialog && <ExpenseDialog expense={dialog.expense} onClose={() => setDialog(null)} onSaved={reload} />}
    </div>
  );
}
