"use client";

/**
 * Analytics — origin: GeniusMindsCRM-Complete ("PIPELINE › Analytics").
 * GM showed hard-coded figures here; every number below is computed
 * from live gm_* data (see src/lib/gm/insights.ts).
 */
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Download, Search, TrendingUp, Users } from "lucide-react";
import { useGmSnapshot } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { AdmissionsChart } from "@/components/gm/admissions-chart";
import { GmCard, GmCardHead, GmError, GmLoading, GmPageHeader, GmStatCard } from "@/components/gm/gm-ui";
import { downloadCsv, toCsv } from "@/lib/gm/csv";
import { todayIso } from "@/lib/gm/format";
import { admissionsSeries, conversionRate, enrolledByCourse, leadName, statusCounts, topSource } from "@/lib/gm/insights";
import { LEAD_STATUSES } from "@/lib/gm/types";

export default function AnalyticsPage() {
  const t = useTranslations("GM.analytics");
  const c = useTranslations("GM.common");
  const s = useTranslations("GM.lead.status");
  const { data, loading, error } = useGmSnapshot();
  const counts = useMemo(() => statusCounts(data.leads), [data.leads]);
  const series = useMemo(() => admissionsSeries(data.leads, 30, new Date()), [data.leads]);
  const byCourse = useMemo(() => enrolledByCourse(data.leads), [data.leads]);
  const top = topSource(data.leads);
  const activeCourses = data.courses.filter((x) => x.status === "active").length;
  const maxStatus = Math.max(1, ...Object.values(counts));

  function exportLeads() {
    downloadCsv(
      `admissions-${todayIso()}.csv`,
      toCsv(
        ["Name", "Phone", "Email", "Course", "Status", "Source", "Area", "Follow-up", "Created", "Enrolled"],
        data.leads.map((l) => [leadName(l), l.contact?.phone ?? "", l.contact?.email ?? "", l.course?.name ?? "", l.lead_status, l.source, l.area, l.follow_up_date ?? "", l.created_at.slice(0, 10), l.enrolled_at ?? ""]),
      ),
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <GmPageHeader
        eyebrow={c("eyebrowWorkspace")}
        title={t("title")}
        description={t("description")}
        actions={<Button variant="outline" onClick={exportLeads} disabled={!data.leads.length}><Download className="h-4 w-4" /> {c("export")}</Button>}
      />
      {error && <GmError message={error} />}
      {loading ? (
        <GmLoading />
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <GmStatCard label={t("statConversion")} value={`${conversionRate(data.leads)}%`} hint={t("statConversionHint", { enrolled: counts.enrolled, total: data.leads.length })} icon={TrendingUp} />
            <GmStatCard label={t("statLeads")} value={data.leads.length} hint={t("statLeadsHint")} icon={Users} />
            <GmStatCard label={t("statSource")} value={top?.source ?? "—"} hint={top ? t("statSourceHint", { share: top.share }) : t("statSourceNone")} icon={Search} />
            <GmStatCard label={t("statCourses")} value={activeCourses} hint={t("statCoursesHint")} icon={BookOpen} />
          </div>
          <GmCard>
            <GmCardHead title={t("chartTitle")} description={t("chartSub")} />
            <AdmissionsChart data={series} />
          </GmCard>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <GmCard>
              <GmCardHead title={t("byStatus")} />
              <div className="space-y-3">
                {LEAD_STATUSES.map((st) => (
                  <div key={st}>
                    <div className="mb-1 flex justify-between text-xs"><span className="text-foreground">{s(st)}</span><b className="text-foreground">{counts[st]}</b></div>
                    <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(counts[st] / maxStatus) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </GmCard>
            <GmCard>
              <GmCardHead title={t("popularCourses")} />
              {data.courses.length ? (
                [...data.courses]
                  .sort((a, b) => (byCourse.get(b.id) ?? 0) - (byCourse.get(a.id) ?? 0))
                  .map((co) => (
                    <div key={co.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
                      <span className="text-foreground">{co.name}{co.batch ? <span className="text-muted-foreground"> · {co.batch}</span> : null}</span>
                      <span className="text-muted-foreground">{t("enrolledCount", { count: byCourse.get(co.id) ?? 0 })}</span>
                    </div>
                  ))
              ) : (
                <p className="py-6 text-center text-xs text-muted-foreground">{t("noCourses")}</p>
              )}
            </GmCard>
          </div>
        </>
      )}
    </div>
  );
}
