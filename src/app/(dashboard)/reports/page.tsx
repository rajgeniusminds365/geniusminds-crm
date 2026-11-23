"use client";

/**
 * Report builder — origin: GeniusMindsCRM-Complete
 * ("PIPELINE › Report builder"): three snapshot reports downloaded as
 * CSV. GM's buttons only showed a toast; these export live data.
 */
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BarChart3, CalendarClock, Download, IndianRupee } from "lucide-react";
import { useGmSnapshot } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { GmCard, GmError, GmPageHeader } from "@/components/gm/gm-ui";
import { downloadCsv, toCsv } from "@/lib/gm/csv";
import { todayIso } from "@/lib/gm/format";
import { leadName } from "@/lib/gm/insights";
import { contactLabel } from "@/lib/gm/types";

export default function ReportsPage() {
  const t = useTranslations("GM.reports");
  const c = useTranslations("GM.common");
  const { data, loading, error } = useGmSnapshot();
  const day = todayIso();

  const reports = [
    {
      key: "admissions",
      icon: BarChart3,
      count: data.leads.length,
      run: () =>
        downloadCsv(`admissions-report-${day}.csv`, toCsv(
          ["Name", "Phone", "Email", "Course", "Batch", "Status", "Source", "Area", "Follow-up", "Created", "Enrolled"],
          data.leads.map((l) => [leadName(l), l.contact?.phone ?? "", l.contact?.email ?? "", l.course?.name ?? "", l.course?.batch ?? "", l.lead_status, l.source, l.area, l.follow_up_date ?? "", l.created_at.slice(0, 10), l.enrolled_at ?? ""]),
        )),
    },
    {
      key: "payments",
      icon: IndianRupee,
      count: data.payments.length,
      run: () =>
        downloadCsv(`payments-report-${day}.csv`, toCsv(
          ["Learner", "Course", "Amount", "Currency", "Date", "Method", "Reference", "Status"],
          data.payments.map((p) => [p.payer_name, p.course?.name ?? "", p.amount, p.currency, p.paid_on, p.method, p.reference, p.status]),
        )),
    },
    {
      key: "activity",
      icon: CalendarClock,
      count: data.activities.length,
      run: () =>
        downloadCsv(`activity-report-${day}.csv`, toCsv(
          ["Title", "Type", "Date", "Time", "Contact", "Done", "Notes"],
          data.activities.map((a) => [a.title, a.activity_type, a.due_date, a.due_time ?? "", contactLabel(a.contact), a.done ? "yes" : "no", a.notes]),
        )),
    },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl">
      <GmPageHeader eyebrow={c("eyebrowWorkspace")} title={t("title")} description={t("description")} />
      {error && <GmError message={error} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <GmCard key={r.key}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary"><r.icon className="h-4 w-4" /></span>
            <h3 className="mt-3 text-sm font-semibold text-foreground">{t(`${r.key}.title`)}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t(`${r.key}.body`)}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t("rows", { count: r.count })}</p>
            <Button
              className="mt-3"
              variant="outline"
              disabled={loading || r.count === 0}
              onClick={() => {
                r.run();
                toast.success(t("ready"));
              }}
            >
              <Download className="h-4 w-4" /> {t("generate")}
            </Button>
          </GmCard>
        ))}
      </div>
    </div>
  );
}
