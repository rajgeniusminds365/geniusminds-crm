"use client";

/**
 * Batches & courses — origin: GeniusMindsCRM-Complete
 * ("EDUCATION › Batches & Courses"). Table gm_courses (migration 060).
 * Student counts are computed from enrolled lead profiles, not stored.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BookOpen, Pencil, Plus, Trash2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGmCanEdit, useGmIsAdmin, useGmRows } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GmFormDialog } from "@/components/gm/form-dialog";
import { GmCard, GmEmpty, GmError, GmField, GmLoading, GmPageHeader, GmPill, GmSelect } from "@/components/gm/gm-ui";
import { formatMoney } from "@/lib/gm/format";
import { enrolledByCourse } from "@/lib/gm/insights";
import { GM_DEFAULT_CURRENCY, type GmCourse, type GmLeadProfile } from "@/lib/gm/types";
import { CURRENCIES } from "@/lib/currency";

function CourseDialog({ course, onClose, onSaved }: { course: GmCourse | null; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations("GM.courses");
  const { accountId } = useAuth();
  const [name, setName] = useState(course?.name ?? "");
  const [batch, setBatch] = useState(course?.batch ?? "");
  const [fee, setFee] = useState(course ? String(course.fee) : "");
  const [currency, setCurrency] = useState(course?.currency ?? GM_DEFAULT_CURRENCY);
  const [status, setStatus] = useState<GmCourse["status"]>(course?.status ?? "active");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!accountId) return;
    if (!name.trim()) return void toast.error(t("nameRequired"));
    const feeNum = Number(fee || 0);
    if (!Number.isFinite(feeNum) || feeNum < 0) return void toast.error(t("feeInvalid"));
    setBusy(true);
    const payload = { account_id: accountId, name: name.trim(), batch: batch.trim(), fee: feeNum, currency, status };
    const db = createClient();
    const { error } = course
      ? await db.from("gm_courses").update(payload).eq("id", course.id)
      : await db.from("gm_courses").insert(payload);
    setBusy(false);
    if (error) return void toast.error(error.code === "23505" ? t("duplicate") : error.message);
    toast.success(t("saved"));
    onClose();
    onSaved();
  }

  return (
    <GmFormDialog open onOpenChange={(o) => !o && onClose()} title={course ? t("editTitle") : t("addTitle")} busy={busy} onSubmit={save}>
      <GmField label={t("fieldName")} wide>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </GmField>
      <GmField label={t("fieldBatch")}>
        <Input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="FSD-24" />
      </GmField>
      <GmField label={t("fieldStatus")}>
        <GmSelect value={status} onChange={(v) => setStatus(v as GmCourse["status"])} options={[{ value: "active", label: t("active") }, { value: "archived", label: t("archived") }]} />
      </GmField>
      <GmField label={t("fieldFee")}>
        <Input type="number" min="0" step="1" value={fee} onChange={(e) => setFee(e.target.value)} />
      </GmField>
      <GmField label={t("fieldCurrency")}>
        <GmSelect value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.label}` }))} />
      </GmField>
    </GmFormDialog>
  );
}

export default function CoursesPage() {
  const t = useTranslations("GM.courses");
  const c = useTranslations("GM.common");
  const canEdit = useGmCanEdit();
  const isAdmin = useGmIsAdmin();
  const courses = useGmRows<GmCourse>("gm_courses", { order: "name", ascending: true });
  const leads = useGmRows<GmLeadProfile>("gm_lead_profiles", { select: "id, course_id, lead_status, contact_id, created_at, enrolled_at", eq: { lead_status: "enrolled" } });
  const counts = useMemo(() => enrolledByCourse(leads.rows), [leads.rows]);
  const [dialog, setDialog] = useState<{ course: GmCourse | null } | null>(null);

  async function remove(course: GmCourse) {
    if (!confirm(t("confirmDelete"))) return;
    const { error } = await createClient().from("gm_courses").delete().eq("id", course.id);
    if (error) toast.error(error.message);
    else {
      toast.success(c("deleted"));
      courses.reload();
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <GmPageHeader
        eyebrow={c("eyebrowWorkspace")}
        title={t("title")}
        description={t("description")}
        actions={canEdit && (
          <Button onClick={() => setDialog({ course: null })}>
            <Plus className="h-4 w-4" /> {t("add")}
          </Button>
        )}
      />
      {(courses.error || leads.error) && <GmError message={(courses.error || leads.error)!} />}
      {courses.loading ? (
        <GmLoading />
      ) : courses.rows.length === 0 ? (
        <GmCard><GmEmpty title={t("emptyTitle")} body={t("emptyBody")} /></GmCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.rows.map((course) => (
            <GmCard key={course.id}>
              <div className="flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <BookOpen className="h-4 w-4" />
                </span>
                <GmPill tone={course.status === "active" ? "green" : "muted"}>{course.status === "active" ? t("active") : t("archived")}</GmPill>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{course.name}</h3>
              <p className="text-xs text-muted-foreground">{course.batch ? t("batch", { batch: course.batch }) : t("noBatch")}</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> {t("studentCount", { count: counts.get(course.id) ?? 0 })}
                </span>
                <b className="text-foreground">{formatMoney(course.fee, course.currency)}</b>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Link href="/students" className="text-xs font-medium text-primary hover:underline">{t("viewLearners")} →</Link>
                <div className="flex gap-1">
                  {canEdit && (
                    <Button size="icon-sm" variant="ghost" aria-label={c("edit")} onClick={() => setDialog({ course })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="icon-sm" variant="ghost" aria-label={c("delete")} onClick={() => remove(course)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </GmCard>
          ))}
        </div>
      )}
      {dialog && <CourseDialog course={dialog.course} onClose={() => setDialog(null)} onSaved={courses.reload} />}
    </div>
  );
}
