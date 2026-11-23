"use client";

/** Create / edit a GM activity (shared by Activities and Schedule). */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { todayIso } from "@/lib/gm/format";
import { ACTIVITY_TYPES, type ActivityType, type GmActivity, type GmContactRef } from "@/lib/gm/types";
import { GmFormDialog } from "./form-dialog";
import { GmField, GmSelect } from "./gm-ui";
import { ContactPicker } from "./contact-picker";

export function ActivityDialog({
  open,
  onOpenChange,
  activity,
  defaultDate,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  activity?: GmActivity | null;
  defaultDate?: string;
  onSaved?: () => void;
}) {
  const t = useTranslations("GM.activities");
  const { accountId } = useAuth();
  const [title, setTitle] = useState(activity?.title ?? "");
  const [type, setType] = useState<ActivityType>(activity?.activity_type ?? "call");
  const [date, setDate] = useState(activity?.due_date ?? defaultDate ?? todayIso());
  const [time, setTime] = useState(activity?.due_time?.slice(0, 5) ?? "");
  const [notes, setNotes] = useState(activity?.notes ?? "");
  const [contact, setContact] = useState<GmContactRef | null>(
    activity?.contact ? { ...activity.contact, email: null } : null,
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!accountId) return;
    if (!title.trim()) {
      toast.error(t("titleRequired"));
      return;
    }
    setBusy(true);
    const payload = {
      account_id: accountId,
      title: title.trim(),
      activity_type: type,
      due_date: date,
      due_time: time || null,
      notes: notes.trim(),
      contact_id: contact?.id ?? null,
    };
    const supabase = createClient();
    const { error } = activity
      ? await supabase.from("gm_activities").update(payload).eq("id", activity.id)
      : await supabase.from("gm_activities").insert(payload);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(activity ? t("updated") : t("created"));
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <GmFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={activity ? t("editTitle") : t("addTitle")}
      busy={busy}
      onSubmit={save}
    >
      <GmField label={t("fieldTitle")} wide>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </GmField>
      <GmField label={t("fieldType")}>
        <GmSelect
          value={type}
          onChange={(v) => setType(v as ActivityType)}
          options={ACTIVITY_TYPES.map((v) => ({ value: v, label: t(`type.${v}`) }))}
        />
      </GmField>
      <GmField label={t("fieldDate")}>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </GmField>
      <GmField label={t("fieldTime")}>
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </GmField>
      <GmField label={t("fieldContact")} wide>
        <ContactPicker value={contact} onChange={setContact} />
      </GmField>
      <GmField label={t("fieldNotes")} wide>
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </GmField>
    </GmFormDialog>
  );
}
