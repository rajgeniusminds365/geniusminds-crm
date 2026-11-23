"use client";

/**
 * Landing pages — origin: GeniusMindsCRM-Complete ("MARKETING ›
 * Landing pages" + its course landing page builder: course, next
 * batch, location, short promise; Draft / Published). Saved in
 * gm_landing_pages (migration 063). The page is previewed here and
 * can be downloaded as a standalone HTML file to host anywhere.
 */
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, Eye, Globe, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGmCanEdit, useGmRows } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GmFormDialog } from "@/components/gm/form-dialog";
import { GmCard, GmEmpty, GmError, GmField, GmLoading, GmPageHeader, GmPill, GmSelect } from "@/components/gm/gm-ui";
import { landingHtml, safeCtaUrl } from "@/lib/gm/landing-html";
import type { GmCourse, GmLandingPage, LandingStatus } from "@/lib/gm/types";

export default function LandingPagesPage() {
  const t = useTranslations("GM.landing");
  const c = useTranslations("GM.common");
  const { accountId, account } = useAuth();
  const canEdit = useGmCanEdit();
  const pages = useGmRows<GmLandingPage>("gm_landing_pages", { order: "updated_at" });
  const courses = useGmRows<GmCourse>("gm_courses", { order: "name", ascending: true, realtime: false });
  const [edit, setEdit] = useState<{ page: GmLandingPage | null } | null>(null);
  const [preview, setPreview] = useState<GmLandingPage | null>(null);
  const [form, setForm] = useState({ course_id: "", course_name: "", batch_label: "", location: "", promise: "", cta_url: "", status: "draft" as LandingStatus });
  const [busy, setBusy] = useState(false);

  function openEditor(page: GmLandingPage | null) {
    const first = courses.rows[0];
    setForm(
      page
        ? { course_id: page.course_id ?? "", course_name: page.course_name, batch_label: page.batch_label, location: page.location, promise: page.promise, cta_url: page.cta_url, status: page.status }
        : { course_id: first?.id ?? "", course_name: first?.name ?? "", batch_label: first?.batch ?? "", location: "", promise: "", cta_url: "", status: "draft" },
    );
    setEdit({ page });
  }

  function html(p: Pick<GmLandingPage, "course_name" | "batch_label" | "location" | "promise" | "cta_url">) {
    return landingHtml({
      org: account?.name ?? "",
      eyebrow: t("admissionsOpen"),
      course: p.course_name,
      promise: p.promise,
      batch: p.batch_label,
      location: p.location,
      cta: t("enquire"),
      contactHref: p.cta_url,
    });
  }

  async function save() {
    if (!accountId || !edit) return;
    if (!form.course_name.trim()) return void toast.error(t("courseRequired"));
    if (form.cta_url.trim() && !safeCtaUrl(form.cta_url)) return void toast.error(t("ctaInvalid"));
    setBusy(true);
    const payload = { ...form, cta_url: form.cta_url.trim(), account_id: accountId, course_id: form.course_id || null, course_name: form.course_name.trim() };
    const db = createClient();
    const { error } = edit.page ? await db.from("gm_landing_pages").update(payload).eq("id", edit.page.id) : await db.from("gm_landing_pages").insert(payload);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(form.status === "published" ? t("savedPublished") : t("savedDraft"));
    setEdit(null);
    pages.reload();
  }

  async function remove(p: GmLandingPage) {
    if (!confirm(c("confirmDelete"))) return;
    const { error } = await createClient().from("gm_landing_pages").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else pages.reload();
  }

  function download(p: GmLandingPage) {
    const blob = new Blob([html(p)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.course_name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "landing"}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <GmPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={canEdit && <Button onClick={() => openEditor(null)}><Plus className="h-4 w-4" /> {t("add")}</Button>}
      />
      {pages.error && <GmError message={pages.error} />}
      {pages.loading ? (
        <GmLoading />
      ) : pages.rows.length === 0 ? (
        <GmCard><GmEmpty title={t("emptyTitle")} body={t("emptyBody")} /></GmCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.rows.map((p) => (
            <GmCard key={p.id}>
              <div className="flex items-center justify-between">
                <GmPill tone={p.status === "published" ? "green" : "muted"}>{t(`status.${p.status}`)}</GmPill>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{t("cardTitle", { course: p.course_name })}</h3>
              <p className="text-xs text-muted-foreground">{t("edited", { when: formatDistanceToNow(new Date(p.updated_at), { addSuffix: true }) })}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setPreview(p)}><Eye className="h-3.5 w-3.5" /> {t("preview")}</Button>
                <Button size="sm" variant="outline" onClick={() => download(p)}><Download className="h-3.5 w-3.5" /> HTML</Button>
                {canEdit && <Button size="icon-sm" variant="ghost" aria-label={c("edit")} onClick={() => openEditor(p)}><Pencil className="h-3.5 w-3.5" /></Button>}
                {canEdit && <Button size="icon-sm" variant="ghost" aria-label={c("delete")} onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></Button>}
              </div>
            </GmCard>
          ))}
        </div>
      )}

      {edit && (
        <GmFormDialog open onOpenChange={(o) => !o && setEdit(null)} title={t("builderTitle")} description={t("builderHint")} busy={busy} onSubmit={save}>
          <GmField label={t("fieldCourse")} wide>
            <GmSelect
              value={form.course_id}
              onChange={(id) => {
                const co = courses.rows.find((x) => x.id === id);
                setForm((f) => ({ ...f, course_id: id, course_name: co?.name ?? f.course_name, batch_label: co?.batch || f.batch_label }));
              }}
              options={[{ value: "", label: t("customCourse") }, ...courses.rows.map((co) => ({ value: co.id, label: co.batch ? `${co.name} · ${co.batch}` : co.name }))]}
            />
          </GmField>
          <GmField label={t("fieldCourseName")} wide><Input value={form.course_name} onChange={(e) => setForm({ ...form, course_name: e.target.value })} required /></GmField>
          <GmField label={t("fieldBatch")}><Input value={form.batch_label} onChange={(e) => setForm({ ...form, batch_label: e.target.value })} placeholder={t("batchHint")} /></GmField>
          <GmField label={t("fieldLocation")}><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t("locationHint")} /></GmField>
          <GmField label={t("fieldPromise")} wide><Input value={form.promise} onChange={(e) => setForm({ ...form, promise: e.target.value })} placeholder={t("promiseHint")} /></GmField>
          <GmField label={t("fieldCta")} wide><Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="https://wa.me/919000000000" /></GmField>
          <GmField label={t("fieldStatus")}>
            <GmSelect value={form.status} onChange={(v) => setForm({ ...form, status: v as LandingStatus })} options={[{ value: "draft", label: t("status.draft") }, { value: "published", label: t("status.published") }]} />
          </GmField>
        </GmFormDialog>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>{t("previewTitle", { course: preview?.course_name ?? "" })}</DialogTitle></DialogHeader>
          {preview && <iframe title={preview.course_name} sandbox="" srcDoc={html(preview)} className="h-80 w-full rounded-lg border border-border bg-white" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
