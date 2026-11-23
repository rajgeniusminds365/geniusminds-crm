"use client";

/**
 * GM "Import students / leads" — CSV with columns name, phone, email,
 * course, area, status, source. Each row becomes (or reuses, matched
 * by phone) a wacrm contact plus its gm_lead_profiles row.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { findExistingContact } from "@/lib/contacts/dedupe";
import { parseLeadCsv } from "@/lib/gm/csv";
import { LEAD_STATUSES, type GmCourse, type LeadStatus } from "@/lib/gm/types";
import { GmFormDialog } from "./form-dialog";
import { GmField } from "./gm-ui";

export function LeadImportDialog({
  open,
  onOpenChange,
  defaultStatus,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultStatus: LeadStatus;
  onDone?: () => void;
}) {
  const t = useTranslations("GM.import");
  const { accountId, user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!accountId || !user) return;
    if (!file) {
      toast.error(t("chooseFile"));
      return;
    }
    setBusy(true);
    const { rows, hasPhoneColumn } = parseLeadCsv(await file.text());
    if (!hasPhoneColumn) {
      setBusy(false);
      toast.error(t("noPhoneColumn"));
      return;
    }
    const db = createClient();
    const { data: courseRows } = await db.from("gm_courses").select("id, name, batch").eq("account_id", accountId);
    const courses = (courseRows ?? []) as Pick<GmCourse, "id" | "name" | "batch">[];
    let imported = 0;
    let reused = 0;
    let skipped = 0;
    for (const r of rows) {
      if (!r.phone.replace(/\D/g, "")) {
        skipped++;
        continue;
      }
      let contactId: string | null = null;
      const existing = await findExistingContact(db, accountId, r.phone);
      if (existing) {
        contactId = existing.id;
        reused++;
      } else {
        const { data, error } = await db
          .from("contacts")
          .insert({ user_id: user.id, account_id: accountId, phone: r.phone, name: r.name || null, email: r.email || null })
          .select("id")
          .single();
        if (error || !data) {
          skipped++;
          continue;
        }
        contactId = data.id as string;
        imported++;
      }
      const course = courses.find(
        (c) => r.course && (c.name.toLowerCase() === r.course.toLowerCase() || c.batch.toLowerCase() === r.course.toLowerCase()),
      );
      const status = (LEAD_STATUSES as readonly string[]).includes(r.status) ? (r.status as LeadStatus) : defaultStatus;
      const { error } = await db.from("gm_lead_profiles").upsert(
        {
          account_id: accountId,
          contact_id: contactId,
          lead_status: status,
          course_id: course?.id ?? null,
          area: r.area,
          source: r.source,
        },
        { onConflict: "contact_id" },
      );
      if (error) skipped++;
    }
    setBusy(false);
    toast.success(t("result", { imported, reused, skipped }));
    onOpenChange(false);
    onDone?.();
  }

  return (
    <GmFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      busy={busy}
      submitLabel={t("submit")}
      onSubmit={run}
    >
      <GmField label={t("file")} wide>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded-lg border border-dashed border-border p-3 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/15 file:px-3 file:py-1 file:text-primary"
        />
      </GmField>
    </GmFormDialog>
  );
}
