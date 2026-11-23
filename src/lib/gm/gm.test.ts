import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";
import { generatePostIdeas } from "./post-ideas";
import {
  admissionsSeries,
  conversionRate,
  feeLines,
  followUps,
  receivedTotal,
  statusCounts,
  topSource,
} from "./insights";
import { answerCrmQuestion } from "./assistant";
import { initialsOf, toIsoDate } from "./format";
import type { GmCourse, GmLeadProfile, GmPayment } from "./types";

const course: GmCourse = {
  id: "c1", account_id: "a", name: "Full Stack Development", batch: "FSD-24",
  fee: 45000, currency: "INR", status: "active", created_at: "2026-11-01T00:00:00Z",
};

function lead(id: string, name: string, over: Partial<GmLeadProfile> = {}): GmLeadProfile {
  return {
    id, account_id: "a", contact_id: `ct-${id}`, course_id: "c1", lead_status: "new",
    source: "", area: "", follow_up_date: null, enrolled_at: null,
    created_at: "2026-11-20T10:00:00Z", updated_at: "2026-11-20T10:00:00Z",
    contact: { id: `ct-${id}`, name, phone: "91900000000" + id, email: null },
    course: { id: "c1", name: course.name, batch: course.batch, fee: course.fee, currency: "INR" },
    ...over,
  };
}

function pay(contact: string, amount: number, over: Partial<GmPayment> = {}): GmPayment {
  return {
    id: `p-${contact}-${amount}`, account_id: "a", contact_id: contact, payer_name: "x", course_id: "c1",
    amount, currency: "INR", paid_on: "2026-11-21", method: "", reference: "", status: "received",
    created_at: "2026-11-21T00:00:00Z", ...over,
  };
}

const leads = [
  lead("1", "Aarav Mehta", { source: "Website", follow_up_date: "2026-11-23" }),
  lead("2", "Diya Sharma", { lead_status: "contacted", source: "Website", follow_up_date: "2026-11-20" }),
  lead("3", "Kabir Nair", { lead_status: "enrolled", source: "Referral", enrolled_at: "2026-11-22", follow_up_date: "2026-11-01" }),
  lead("4", "Sana Khan", { lead_status: "qualified", follow_up_date: "2026-11-30" }),
];

describe("csv", () => {
  it("quotes and neutralises formulas", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell(null)).toBe("");
    expect(toCsv(["h1", "h2"], [[1, "x"]])).toBe("h1,h2\r\n1,x");
  });
});

describe("post ideas", () => {
  it("fills three GM templates with the subject", () => {
    const ideas = generatePostIdeas("Data Analytics");
    expect(ideas).toHaveLength(3);
    expect(ideas.every((i) => i.includes("Data Analytics"))).toBe(true);
    expect(generatePostIdeas("  ")[0]).toContain("our next course");
  });
});

describe("insights", () => {
  it("counts statuses and conversion", () => {
    expect(statusCounts(leads)).toEqual({ new: 1, contacted: 1, qualified: 1, enrolled: 1 });
    expect(conversionRate(leads)).toBe(25);
    expect(conversionRate([])).toBe(0);
  });
  it("finds the top source", () => {
    expect(topSource(leads)).toEqual({ source: "Website", share: 50 });
    expect(topSource([])).toBeNull();
  });
  it("splits follow-ups and skips enrolled learners", () => {
    const fu = followUps(leads, "2026-11-23");
    expect(fu.dueToday.map((l) => l.id)).toEqual(["1"]);
    expect(fu.overdue.map((l) => l.id)).toEqual(["2"]);
    expect(fu.upcoming.map((l) => l.id)).toEqual(["4"]);
  });
  it("totals only received payments", () => {
    expect(receivedTotal([pay("a", 100), pay("b", 50, { status: "pending" })])).toBe(100);
  });
  it("builds a daily admissions series", () => {
    const s = admissionsSeries(leads, 5, new Date(2026, 10, 23, 12));
    expect(s).toHaveLength(5);
    expect(s[s.length - 1]!.date).toBe("2026-11-23");
    expect(s.find((p) => p.date === "2026-11-22")!.enrolments).toBe(1);
    expect(s.reduce((n, p) => n + p.enquiries, 0)).toBe(4);
  });
  it("computes fee balances", () => {
    const lines = feeLines([leads[2]!, leads[0]!], [pay("ct-3", 20000), pay("ct-3", 25000), pay("ct-1", 5000, { status: "refunded" })]);
    expect(lines[0]).toMatchObject({ paid: 45000, balance: 0, state: "paid" });
    expect(lines[1]).toMatchObject({ paid: 0, balance: 45000, state: "unpaid" });
    const partial = feeLines([leads[0]!], [pay("ct-1", 1000)])[0]!;
    expect(partial.state).toBe("partial");
    expect(feeLines([lead("9", "X", { course_id: null, course: null })], [])[0]!.state).toBe("no_course");
  });
});

describe("assistant (ported from GM)", () => {
  const snap = { leads, courses: [course], activities: [], payments: [pay("ct-3", 20000, { payer_name: "Kabir Nair" })], expenses: [] };
  it("answers about a named learner", () => {
    expect(answerCrmQuestion(snap, "Tell me about Aarav Mehta", "2026-11-23")).toMatch(/^Aarav Mehta — course: Full Stack Development/);
  });
  it("answers follow-ups due today and overdue", () => {
    expect(answerCrmQuestion(snap, "Who needs a follow-up today?", "2026-11-23")).toContain("1 follow-ups due today: Aarav Mehta");
    expect(answerCrmQuestion(snap, "any overdue?", "2026-11-23")).toContain("Diya Sharma");
  });
  it("answers payments and courses", () => {
    expect(answerCrmQuestion(snap, "How much have we received?", "2026-11-23")).toContain("1 payments");
    expect(answerCrmQuestion(snap, "Show our courses", "2026-11-23")).toContain("Full Stack Development (FSD-24) — 1 enrolled");
  });
  it("handles empty input", () => {
    expect(answerCrmQuestion(snap, "  ", "2026-11-23")).toBe("Enter a question about your CRM.");
  });
});

describe("format", () => {
  it("initials and dates", () => {
    expect(initialsOf("Aarav Mehta")).toBe("AM");
    expect(initialsOf("")).toBe("?");
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

import { parseCsvLine, parseLeadCsv } from "./csv";
describe("lead csv import", () => {
  it("parses quoted cells", () => {
    expect(parseCsvLine('a,"b, c","d ""e"""')).toEqual(["a", "b, c", 'd "e"']);
  });
  it("maps GM columns case-insensitively", () => {
    const r = parseLeadCsv("Name,Phone,Course,Status\nAarav,+91 90000 00001,Data Analytics,Enrolled\n");
    expect(r.hasPhoneColumn).toBe(true);
    expect(r.rows[0]).toMatchObject({ name: "Aarav", phone: "+91 90000 00001", course: "Data Analytics", status: "enrolled", email: "" });
    expect(parseLeadCsv("name\nx").hasPhoneColumn).toBe(false);
  });
});

import { landingHtml, safeCtaUrl } from "./landing-html";
import { certificateHtml } from "./certificate-html";
describe("generated pages", () => {
  it("only allows safe CTA links and escapes content", () => {
    expect(safeCtaUrl("javascript:alert(1)")).toBe("");
    expect(safeCtaUrl(" https://wa.me/91900 ")).toBe("https://wa.me/91900");
    const html = landingHtml({ org: "", eyebrow: "Admissions", course: "<b>x</b>", promise: "", batch: "", location: "", cta: "Go", contactHref: "javascript:x" });
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain('class="b"');
  });
  it("escapes certificate fields", () => {
    const html = certificateHtml({ heading: "H", presented: "P", recipient: "<script>", completed: "C", course: "K", issuedLabel: "I", issuedOn: "D", numberLabel: "N", number: "CERT-1", org: "O" });
    expect(html).toContain("&lt;script&gt;");
  });
});
