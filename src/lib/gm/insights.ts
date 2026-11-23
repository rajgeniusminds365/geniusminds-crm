/**
 * Pure calculations behind GM Analytics, Intelligence, Fees and the
 * assistant. Kept free of React / Supabase so it is unit-tested.
 */
import { toIsoDate } from "./format";
import {
  contactLabel,
  LEAD_STATUSES,
  type GmActivity,
  type GmCourse,
  type GmExpense,
  type GmLeadProfile,
  type GmPayment,
  type LeadStatus,
} from "./types";

export interface GmSnapshot {
  leads: GmLeadProfile[];
  courses: GmCourse[];
  activities: GmActivity[];
  payments: GmPayment[];
  expenses: GmExpense[];
}

export function statusCounts(leads: GmLeadProfile[]): Record<LeadStatus, number> {
  const out = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const l of leads) out[l.lead_status] = (out[l.lead_status] ?? 0) + 1;
  return out;
}

/** Percentage of leads that enrolled, rounded to whole number. */
export function conversionRate(leads: GmLeadProfile[]): number {
  if (!leads.length) return 0;
  return Math.round((statusCounts(leads).enrolled / leads.length) * 100);
}

export function topSource(leads: GmLeadProfile[]): { source: string; share: number } | null {
  const counts = new Map<string, number>();
  for (const l of leads) {
    const s = l.source.trim();
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  let best: [string, number] | null = null;
  for (const e of counts) if (!best || e[1] > best[1]) best = e;
  if (!best) return null;
  return { source: best[0], share: Math.round((best[1] / leads.length) * 100) };
}

export interface FollowUps {
  dueToday: GmLeadProfile[];
  overdue: GmLeadProfile[];
  upcoming: GmLeadProfile[];
}

/** Same rules as GM's assistant: enrolled leads need no follow-up. */
export function followUps(leads: GmLeadProfile[], today: string): FollowUps {
  const open = leads.filter((l) => l.lead_status !== "enrolled" && l.follow_up_date);
  return {
    dueToday: open.filter((l) => l.follow_up_date === today),
    overdue: open.filter((l) => (l.follow_up_date as string) < today),
    upcoming: open.filter((l) => (l.follow_up_date as string) > today),
  };
}

export function receivedTotal(payments: GmPayment[]): number {
  return payments.filter((p) => p.status === "received").reduce((s, p) => s + Number(p.amount || 0), 0);
}

export function sumAmounts(rows: { amount: number }[]): number {
  return rows.reduce((s, r) => s + Number(r.amount || 0), 0);
}

export function inMonth(iso: string | null | undefined, ref: Date): boolean {
  if (!iso) return false;
  return iso.slice(0, 7) === toIsoDate(ref).slice(0, 7);
}

export interface DailyPoint {
  date: string;
  enquiries: number;
  enrolments: number;
}

/** GM "Admissions overview": new enquiries vs enrolments per day. */
export function admissionsSeries(leads: GmLeadProfile[], days: number, now: Date): DailyPoint[] {
  const points: DailyPoint[] = [];
  const index = new Map<string, DailyPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const p = { date: toIsoDate(d), enquiries: 0, enrolments: 0 };
    points.push(p);
    index.set(p.date, p);
  }
  for (const l of leads) {
    const created = index.get(toIsoDate(new Date(l.created_at)));
    if (created) created.enquiries++;
    if (l.enrolled_at) {
      const e = index.get(l.enrolled_at.slice(0, 10));
      if (e) e.enrolments++;
    }
  }
  return points;
}

/** Enrolled learners per course id. */
export function enrolledByCourse(leads: GmLeadProfile[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of leads) {
    if (l.lead_status === "enrolled" && l.course_id) m.set(l.course_id, (m.get(l.course_id) ?? 0) + 1);
  }
  return m;
}

export interface FeeLine {
  lead: GmLeadProfile;
  fee: number;
  paid: number;
  balance: number;
  lastPayment: GmPayment | null;
  state: "paid" | "partial" | "unpaid" | "no_course";
}

/** GM "Fee management": course fee vs payments received per learner. */
export function feeLines(leads: GmLeadProfile[], payments: GmPayment[]): FeeLine[] {
  return leads.map((lead) => {
    const fee = Number(lead.course?.fee ?? 0);
    const mine = payments
      .filter((p) => p.contact_id === lead.contact_id && p.status === "received")
      .filter((p) => !lead.course_id || !p.course_id || p.course_id === lead.course_id)
      .sort((a, b) => b.paid_on.localeCompare(a.paid_on));
    const paid = sumAmounts(mine);
    const balance = Math.max(fee - paid, 0);
    const state: FeeLine["state"] = !lead.course_id
      ? "no_course"
      : paid <= 0
        ? "unpaid"
        : balance > 0
          ? "partial"
          : "paid";
    return { lead, fee, paid, balance, lastPayment: mine[0] ?? null, state };
  });
}

export function leadName(l: GmLeadProfile): string {
  return contactLabel(l.contact) || "Unnamed";
}

/** Activities due on a given date (GM "Today's activity"). */
export function activitiesOn(activities: GmActivity[], date: string): GmActivity[] {
  return activities.filter((a) => a.due_date === date);
}
