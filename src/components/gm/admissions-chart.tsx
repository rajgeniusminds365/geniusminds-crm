"use client";

/** GM "Admissions overview" chart: new enquiries vs enrolments per day. */
import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyPoint } from "@/lib/gm/insights";

export function AdmissionsChart({ data }: { data: DailyPoint[] }) {
  const t = useTranslations("GM.analytics");
  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="gmEnq" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="1" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
          <Tooltip
            labelFormatter={(v) => fmt(String(v))}
            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="enquiries" name={t("seriesEnquiries")} stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#gmEnq)" />
          <Area type="monotone" dataKey="enrolments" name={t("seriesEnrolments")} stroke="var(--chart-2)" strokeWidth={2} strokeDasharray="5 4" fill="transparent" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
