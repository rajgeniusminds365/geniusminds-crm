"use client";

/**
 * Create / edit the GM admissions details of a contact (status,
 * course, source, area, follow-up). Upserts gm_lead_profiles on
 * contact_id, so one contact always has at most one lead profile.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGmRows } from "@/hooks/use-gm-data";
import { Input } from "@/components/ui/input";
import { LEAD_STATUSES, type GmContactRef, type GmCourse, type GmLeadProfile, type LeadStatus } from "@/lib/gm/types";
import { GmFormDialog } from "./form-dialog";
import { GmField, GmSelect } from "./gm-ui";
import { ContactPicker } from "./contact-picker";

export function LeadDialog({
  open,
  onOpenChange,
  lead,
  contact: fixedContact,
  defaultStatus = "new",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lead?: GmLeadProfile | null;
  /** When set, the contact is fixed (e.g. from the contact detail view). */
  contact?: GmContactRef | null;
  defaultStatus?: LeadStatus;
  onSaved?: () => void;
}) {
  const t = useTranslations("GM.lead");
  const { accountId } = useAuth();
  const courses = useGmRows<GmCourse>("gm_courses", { order: "name", ascending: true, realtime: false });
  const [contact, setContact] = useState<GmContactRef | null>(fixedContact ?? lead?.contact ?? null);
  const [status, setStatus] = useState<LeadStatus>(lead?.lead_status ?? defaultStatus);
  const [courseId, setCourseId] = useState(lead?.course_id ?? "");
  const [source, setSource] = useState(lead?.source ?? "");
  const [area, setArea] = useState(lead?.area ?? "");
  const [followUp, setFollowUp] = useState(lead?.follow_up_date ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!accountId) return;
    if (!contact) {
      toast.error(t("contactRequired"));
      return;
    }
    setBusy(true);
    const { error } = await createClient()
      .from("gm_lead_profiles")
      .upsert(
        {
          account_id: accountId,
          contact_id: contact.id,
          lead_status: status,
          course_id: courseId || null,
          source: source.trim(),
          area: area.trim(),
          follow_up_date: followUp || null,
        },
        { onConflict: "contact_id" },
      );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("saved"));
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <GmFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={lead ? t("editTitle") : defaultStatus === "enrolled" ? t("addStudentTitle") : t("addTitle")}
      description={t("dialogHint")}
      busy={busy}
      onSubmit={save}
    >
      <GmField label={t("fieldContact")} wide>
        <ContactPicker value={contact} onChange={setContact} allowCreate disabled={!!fixedContact || !!lead} />
      </GmField>
      <GmField label={t("fieldStatus")}>
        <GmSelect value={status} onChange={(v) => setStatus(v as LeadStatus)} options={LEAD_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))} />
      </GmField>
      <GmField label={t("fieldCourse")}>
        <GmSelect
          value={courseId}
          onChange={setCourseId}
          options={[{ value: "", label: t("noCourse") }, ...courses.rows.map((c) => ({ value: c.id, label: c.batch ? `${c.name} · ${c.batch}` : c.name }))]}
        />
      </GmField>
      <GmField label={t("fieldSource")}>
        <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder={t("sourcePlaceholder")} />
      </GmField>
      <GmField label={t("fieldFollowUp")}>
        <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
      </GmField>
      <GmField label={t("fieldArea")} wide>
        <Input value={area} onChange={(e) => setArea(e.target.value)} />
      </GmField>
    </GmFormDialog>
  );
}
