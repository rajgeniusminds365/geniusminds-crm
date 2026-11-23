"use client";

/**
 * Admissions (GeniusMinds) card shown inside wacrm's contact detail
 * view. Additive: it reads / writes only gm_lead_profiles and never
 * touches the contact row itself.
 */
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGmCanEdit, GM_SELECT } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/gm/format";
import type { GmContactRef, GmLeadProfile } from "@/lib/gm/types";
import { GmPill } from "./gm-ui";
import { LeadDialog } from "./lead-dialog";

export function GmLeadCard({ contact }: { contact: GmContactRef }) {
  const t = useTranslations("GM.lead");
  const canEdit = useGmCanEdit();
  const [lead, setLead] = useState<GmLeadProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await createClient().from("gm_lead_profiles").select(GM_SELECT.leads).eq("contact_id", contact.id).maybeSingle();
    setLead((data as GmLeadProfile | null) ?? null);
    setLoaded(true);
  }, [contact.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function remove() {
    if (!lead || !confirm(t("confirmRemove"))) return;
    const { error } = await createClient().from("gm_lead_profiles").delete().eq("id", lead.id);
    if (error) return void toast.error(error.message);
    toast.success(t("removed"));
    setLead(null);
  }

  if (!loaded) return null;

  return (
    <div className="mt-4 rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <GraduationCap className="h-4 w-4 text-primary" /> {t("cardTitle")}
        </span>
        {lead && <GmPill tone={lead.lead_status === "enrolled" ? "green" : "blue"}>{t(`status.${lead.lead_status}`)}</GmPill>}
      </div>
      {lead ? (
        <>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">{t("course")}</dt><dd className="text-foreground">{lead.course?.name ?? "—"}</dd>
            <dt className="text-muted-foreground">{t("source")}</dt><dd className="text-foreground">{lead.source || "—"}</dd>
            <dt className="text-muted-foreground">{t("area")}</dt><dd className="text-foreground">{lead.area || "—"}</dd>
            <dt className="text-muted-foreground">{t("followUp")}</dt><dd className="text-foreground">{formatDay(lead.follow_up_date)}</dd>
            {lead.enrolled_at && (<><dt className="text-muted-foreground">{t("enrolledOn")}</dt><dd className="text-foreground">{formatDay(lead.enrolled_at)}</dd></>)}
          </dl>
          {canEdit && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Pencil className="h-3.5 w-3.5" /> {t("cardEdit")}</Button>
              <Button size="sm" variant="ghost" onClick={remove}><Trash2 className="h-3.5 w-3.5" /> {t("cardRemove")}</Button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t("cardEmpty")}</p>
          {canEdit && (
            <Button size="sm" variant="outline" className="mt-2" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" /> {t("cardAdd")}</Button>
          )}
        </>
      )}
      {open && <LeadDialog open onOpenChange={setOpen} lead={lead} contact={contact} onSaved={load} />}
    </div>
  );
}
