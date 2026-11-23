/**
 * "Gro" — the GeniusMinds Web Chat Assistant, ported from GM's
 * server.py `answer_crm_question`. It answers common questions from a
 * snapshot of CRM data with simple matching rules. No external AI
 * service is called (GM didn't use one either).
 */
import { formatMoney } from "./format";
import { followUps, leadName, receivedTotal, sumAmounts, type GmSnapshot } from "./insights";
import type { GmLeadProfile } from "./types";

const STOP = new Set(
  "the a an is are of for to me about please can you we our what who show tell give get find list do does have has and in on my".split(" "),
);

function names(items: GmLeadProfile[]): string {
  return items.map(leadName).join(", ") || "none";
}

function leadDetail(l: GmLeadProfile): string {
  return (
    `${leadName(l)} — course: ${l.course?.name || "not set"}; status: ${l.lead_status}; ` +
    `phone: ${l.contact?.phone || "not set"}; email: ${l.contact?.email || "not set"}; ` +
    `area: ${l.area || "not set"}; source: ${l.source || "not set"}; ` +
    `follow-up: ${l.follow_up_date || "not scheduled"}.`
  );
}

export function answerCrmQuestion(data: GmSnapshot, message: string, today: string): string {
  const raw = (message || "").trim();
  if (!raw) return "Enter a question about your CRM.";
  const q = raw.toLowerCase().replace(/[^\p{L}\p{N}@.+/-]+/gu, " ").trim();
  const words = q.split(/\s+/).filter((w) => w && !STOP.has(w));
  const has = (...ws: string[]) => ws.some((w) => words.includes(w));

  const { leads, courses, payments, expenses, activities } = data;
  const fu = followUps(leads, today);
  const enrolled = leads.filter((l) => l.lead_status === "enrolled");

  // 1. Specific learner / course / payer names first.
  const leadHits = leads.filter((l) => {
    const parts = leadName(l).toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter((w) => w.length > 1);
    return parts.length > 0 && parts.every((w) => q.includes(w));
  });
  if (leadHits.length) return leadHits.slice(0, 8).map(leadDetail).join("\n");

  const courseHits = courses.filter(
    (c) => (c.name && q.includes(c.name.toLowerCase())) || (c.batch && q.includes(c.batch.toLowerCase())),
  );
  if (courseHits.length) {
    return courseHits
      .map((c) => {
        const n = enrolled.filter((l) => l.course_id === c.id).length;
        return `${c.name} — batch ${c.batch || "not set"}; ${n} enrolled; fee ${formatMoney(c.fee, c.currency)}.`;
      })
      .join("\n");
  }

  const payHits = payments.filter((p) => p.payer_name && q.includes(p.payer_name.toLowerCase()));
  if (payHits.length) {
    return payHits
      .map((p) => `${p.payer_name} paid ${formatMoney(p.amount, p.currency)} for ${p.course?.name || "course not set"} on ${p.paid_on} (${p.status}).`)
      .join("\n");
  }

  // 2. Broad intents.
  if (has("overdue", "overdues", "late")) {
    return `There are ${fu.overdue.length} overdue follow-ups: ${names(fu.overdue)}.`;
  }
  if (has("followup", "followups", "follow-up", "follow-ups", "reminder", "today")) {
    if (has("upcoming", "future")) return `There are ${fu.upcoming.length} upcoming follow-ups: ${names(fu.upcoming)}.`;
    return `There are ${fu.dueToday.length} follow-ups due today: ${names(fu.dueToday)}.`;
  }
  if (has("payment", "payments", "revenue", "received", "fee", "fees", "paid", "income", "collected", "much")) {
    return `You have received ${formatMoney(receivedTotal(payments))} across ${payments.filter((p) => p.status === "received").length} payments.`;
  }
  if (has("expense", "expenses", "spent", "spending", "cost", "costs")) {
    return `Total expenses are ${formatMoney(sumAmounts(expenses))} across ${expenses.length} entries; ${expenses.filter((e) => e.status === "pending").length} are pending review.`;
  }
  if (has("course", "courses", "batch", "batches", "program", "programs")) {
    if (!courses.length) return "No courses have been added yet.";
    return courses
      .map((c) => `${c.name} (${c.batch || "no batch"}) — ${enrolled.filter((l) => l.course_id === c.id).length} enrolled, fee ${formatMoney(c.fee, c.currency)}.`)
      .join("\n");
  }
  if (has("enrolled", "students", "student", "learners", "learner")) {
    return `There are ${enrolled.length} enrolled learners: ${names(enrolled)}.`;
  }
  if (has("activity", "activities", "meeting", "meetings", "call", "calls", "schedule")) {
    const open = activities.filter((a) => !a.done);
    return `There are ${open.length} open activities: ${open.slice(0, 8).map((a) => `${a.title} (${a.due_date})`).join(", ") || "none"}.`;
  }
  if (has("lead", "leads", "new", "summary", "overview", "crm", "status")) {
    const by = (s: string) => leads.filter((l) => l.lead_status === s).length;
    return `You have ${leads.length} leads: ${by("new")} new, ${by("contacted")} contacted, ${by("qualified")} qualified and ${by("enrolled")} enrolled.`;
  }
  return "I can answer questions about learners, follow-ups, courses, payments, expenses and activities. Try “Who needs a follow-up today?”";
}
