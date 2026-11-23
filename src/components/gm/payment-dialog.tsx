"use client";

/** Record / edit a GM payment (Payments page and Fee management). */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGmRows } from "@/hooks/use-gm-data";
import { Input } from "@/components/ui/input";
import { CURRENCIES } from "@/lib/currency";
import { todayIso } from "@/lib/gm/format";
import {
  contactLabel,
  GM_DEFAULT_CURRENCY,
  PAYMENT_STATUSES,
  type GmContactRef,
  type GmCourse,
  type GmPayment,
  type PaymentStatus,
} from "@/lib/gm/types";
import { GmFormDialog } from "./form-dialog";
import { GmField, GmSelect } from "./gm-ui";
import { ContactPicker } from "./contact-picker";

export function PaymentDialog({
  payment,
  presetContact,
  presetCourseId,
  presetAmount,
  onClose,
  onSaved,
}: {
  payment?: GmPayment | null;
  presetContact?: GmContactRef | null;
  presetCourseId?: string | null;
  presetAmount?: number;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const t = useTranslations("GM.payments");
  const { accountId } = useAuth();
  const courses = useGmRows<GmCourse>("gm_courses", { order: "name", ascending: true, realtime: false });
  const [contact, setContact] = useState<GmContactRef | null>(presetContact ?? null);
  const [payerName, setPayerName] = useState(payment?.payer_name ?? "");
  const [courseId, setCourseId] = useState(payment?.course_id ?? presetCourseId ?? "");
  const [amount, setAmount] = useState(payment ? String(payment.amount) : presetAmount ? String(presetAmount) : "");
  const [currency, setCurrency] = useState(payment?.currency ?? GM_DEFAULT_CURRENCY);
  const [paidOn, setPaidOn] = useState(payment?.paid_on ?? todayIso());
  const [method, setMethod] = useState(payment?.method ?? "");
  const [reference, setReference] = useState(payment?.reference ?? "");
  const [status, setStatus] = useState<PaymentStatus>(payment?.status ?? "received");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!accountId) return;
    const name = (contact ? contactLabel(contact) : "") || payerName.trim();
    if (!name) return void toast.error(t("payerRequired"));
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return void toast.error(t("amountInvalid"));
    setBusy(true);
    const payload = {
      account_id: accountId,
      contact_id: contact?.id ?? payment?.contact_id ?? null,
      payer_name: name,
      course_id: courseId || null,
      amount: amt,
      currency,
      paid_on: paidOn,
      method: method.trim(),
      reference: reference.trim(),
      status,
    };
    const db = createClient();
    const { error } = payment
      ? await db.from("gm_payments").update(payload).eq("id", payment.id)
      : await db.from("gm_payments").insert(payload);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(t("saved"));
    onClose();
    onSaved?.();
  }

  return (
    <GmFormDialog open onOpenChange={(o) => !o && onClose()} title={payment ? t("editTitle") : t("addTitle")} busy={busy} onSubmit={save}>
      {!payment && (
        <GmField label={t("fieldLearner")} wide>
          <ContactPicker value={contact} onChange={setContact} disabled={!!presetContact} />
        </GmField>
      )}
      {(payment || !contact) && (
        <GmField label={t("fieldPayerName")} wide>
          <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder={t("payerHint")} />
        </GmField>
      )}
      <GmField label={t("fieldCourse")}>
        <GmSelect value={courseId} onChange={setCourseId} options={[{ value: "", label: "—" }, ...courses.rows.map((c) => ({ value: c.id, label: c.batch ? `${c.name} · ${c.batch}` : c.name }))]} />
      </GmField>
      <GmField label={t("fieldStatus")}>
        <GmSelect value={status} onChange={(v) => setStatus(v as PaymentStatus)} options={PAYMENT_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))} />
      </GmField>
      <GmField label={t("fieldAmount")}>
        <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </GmField>
      <GmField label={t("fieldCurrency")}>
        <GmSelect value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c.code, label: c.code }))} />
      </GmField>
      <GmField label={t("fieldDate")}>
        <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
      </GmField>
      <GmField label={t("fieldMethod")}>
        <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder={t("methodHint")} />
      </GmField>
      <GmField label={t("fieldReference")} wide>
        <Input value={reference} onChange={(e) => setReference(e.target.value)} />
      </GmField>
    </GmFormDialog>
  );
}
