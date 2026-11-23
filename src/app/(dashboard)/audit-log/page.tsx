"use client";

/**
 * Audit log — origin: GeniusMindsCRM-Complete ("ADMIN › Audit log").
 * Admin-only. Entries are written by a database trigger on every GM
 * table (migration 065) and can't be edited from the app.
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGmIsAdmin, useGmRows } from "@/hooks/use-gm-data";
import { GmCard, GmEmpty, GmError, GmLoading, GmPageHeader, GmPill, GmSelect, GmTable, GmTd } from "@/components/gm/gm-ui";
import { GmPager, usePaged } from "@/components/gm/pager";
import type { GmAuditEntry } from "@/lib/gm/types";

const ENTITIES = ["gm_lead_profiles", "gm_courses", "gm_activities", "gm_payments", "gm_expenses", "gm_channel_logs", "gm_certificates", "gm_landing_pages"] as const;
const TONE = { create: "green", update: "blue", delete: "red" } as const;

function summarize(details: Record<string, unknown>): string {
  return Object.entries(details)
    .filter(([k]) => !["id", "created_at", "updated_at", "created_by"].includes(k))
    .slice(0, 5)
    .map(([k, v]) => `${k}: ${v === null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

export default function AuditLogPage() {
  const t = useTranslations("GM.audit");
  const { accountId, profileLoading } = useAuth();
  const isAdmin = useGmIsAdmin();
  const { rows, loading, error } = useGmRows<GmAuditEntry>("gm_audit_log", { limit: 1000, realtime: false });
  const [entity, setEntity] = useState("all");
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!accountId || !isAdmin) return;
    createClient()
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("account_id", accountId)
      .then(({ data }) => setNames(Object.fromEntries((data ?? []).map((p) => [p.user_id as string, (p.full_name as string) || (p.email as string)]))));
  }, [accountId, isAdmin]);

  const visible = useMemo(() => (entity === "all" ? rows : rows.filter((r) => r.entity_type === entity)), [rows, entity]);
  const paged = usePaged(visible, 50);

  if (!profileLoading && !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl">
        <GmPageHeader title={t("title")} />
        <GmCard><div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldAlert className="h-4 w-4" /> {t("adminOnly")}</div></GmCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <GmPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          <GmSelect
            ariaLabel={t("filter")}
            className="w-56"
            value={entity}
            onChange={setEntity}
            options={[{ value: "all", label: t("allRecords") }, ...ENTITIES.map((e) => ({ value: e, label: t(`entity.${e}`) }))]}
          />
        }
      />
      {error && <GmError message={error} />}
      <GmCard>
        {loading ? (
          <GmLoading />
        ) : (
          <GmTable head={[t("colTime"), t("colUser"), t("colAction"), t("colRecord"), t("colDetails")]} empty={!visible.length && <GmEmpty title={t("empty")} />}>
            {paged.items.map((r) => (
              <tr key={r.id}>
                <GmTd className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</GmTd>
                <GmTd>{r.user_id ? names[r.user_id] ?? t("formerMember") : t("system")}</GmTd>
                <GmTd><GmPill tone={TONE[r.action]}>{t(`action.${r.action}`)}</GmPill></GmTd>
                <GmTd>{(ENTITIES as readonly string[]).includes(r.entity_type) ? t(`entity.${r.entity_type}`) : r.entity_type}</GmTd>
                <GmTd className="max-w-md truncate text-xs text-muted-foreground" >{summarize(r.details)}</GmTd>
              </tr>
            ))}
          </GmTable>
        )}
        <GmPager {...paged} />
      </GmCard>
    </div>
  );
}
