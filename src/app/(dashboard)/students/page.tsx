"use client";

/**
 * Students — origin: GeniusMindsCRM-Complete ("EDUCATION › Students").
 * Enrolled learners = wacrm contacts whose gm_lead_profiles.lead_status
 * is 'enrolled' (migration 060). Search, paging, add, import, edit.
 */
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GM_SELECT, useGmCanEdit, useGmRows } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadDialog } from "@/components/gm/lead-dialog";
import { LeadImportDialog } from "@/components/gm/lead-import-dialog";
import { GmCard, GmEmpty, GmError, GmLoading, GmPageHeader, GmPerson, GmTable, GmTd } from "@/components/gm/gm-ui";
import { GmPager, usePaged } from "@/components/gm/pager";
import { useContactSheet } from "@/components/gm/contact-sheet";
import { formatDay, formatMoney } from "@/lib/gm/format";
import { contactLabel, type GmLeadProfile } from "@/lib/gm/types";

export default function StudentsPage() {
  const t = useTranslations("GM.students");
  const c = useTranslations("GM.common");
  const canEdit = useGmCanEdit();
  const { rows, loading, error, reload } = useGmRows<GmLeadProfile>("gm_lead_profiles", {
    select: GM_SELECT.leads,
    eq: { lead_status: "enrolled" },
    order: "enrolled_at",
  });
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<{ lead: GmLeadProfile | null } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const { openContact, sheet } = useContactSheet(reload);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [contactLabel(r.contact), r.contact?.phone, r.contact?.email, r.course?.name, r.course?.batch]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [rows, q]);
  const paged = usePaged(filtered, 25);

  async function remove(lead: GmLeadProfile) {
    if (!confirm(t("confirmRemove"))) return;
    const { error: err } = await createClient().from("gm_lead_profiles").delete().eq("id", lead.id);
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
        actions={
          canEdit && (
            <>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" /> {t("import")}
              </Button>
              <Button onClick={() => setDialog({ lead: null })}>
                <Plus className="h-4 w-4" /> {t("add")}
              </Button>
            </>
          )
        }
      />
      {error && <GmError message={error} />}
      <GmCard>
        <div className="mb-3">
          <Input className="max-w-xs" placeholder={c("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {loading ? (
          <GmLoading />
        ) : (
          <GmTable
            head={[t("colStudent"), t("colPhone"), t("colEmail"), t("colCourse"), t("colFee"), t("colEnrolled"), ""]}
            empty={!paged.items.length && <GmEmpty title={c("noRecords")} body={t("empty")} />}
          >
            {paged.items.map((r) => (
              <tr key={r.id}>
                <GmTd>
                  <button type="button" className="text-left hover:opacity-80" onClick={() => openContact(r.contact_id)}>
                    <GmPerson name={contactLabel(r.contact) || "—"} sub={r.area || undefined} />
                  </button>
                </GmTd>
                <GmTd>{r.contact?.phone ?? "—"}</GmTd>
                <GmTd>{r.contact?.email ?? "—"}</GmTd>
                <GmTd>{r.course ? `${r.course.name}${r.course.batch ? ` · ${r.course.batch}` : ""}` : "—"}</GmTd>
                <GmTd>{r.course ? formatMoney(r.course.fee, r.course.currency) : "—"}</GmTd>
                <GmTd>{formatDay(r.enrolled_at)}</GmTd>
                <GmTd className="text-right">
                  {canEdit && (
                    <div className="flex justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" aria-label={c("edit")} onClick={() => setDialog({ lead: r })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label={c("delete")} onClick={() => remove(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </GmTd>
              </tr>
            ))}
          </GmTable>
        )}
        <GmPager {...paged} />
      </GmCard>
      {dialog && (
        <LeadDialog
          key={dialog.lead?.id ?? "new"}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          lead={dialog.lead}
          defaultStatus="enrolled"
          onSaved={reload}
        />
      )}
      {sheet}
      {importOpen && <LeadImportDialog open onOpenChange={setImportOpen} defaultStatus="enrolled" onDone={reload} />}
    </div>
  );
}
