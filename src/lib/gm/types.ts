/**
 * GeniusMinds (GM) record types.
 *
 * Origin: GeniusMindsCRM-Complete (education / admissions CRM),
 * rebuilt on wacrm's Supabase backend. Tables are created by
 * migrations 060–066 and are all account-scoped with RLS.
 */

export const LEAD_STATUSES = ["new", "contacted", "qualified", "enrolled"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const ACTIVITY_TYPES = ["call", "meeting", "follow_up"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const PAYMENT_STATUSES = ["received", "pending", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const EXPENSE_STATUSES = ["pending", "approved", "rejected"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const CHANNELS = ["email", "call"] as const;
export type Channel = (typeof CHANNELS)[number];

export const DIRECTIONS = ["outbound", "inbound"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const LANDING_STATUSES = ["draft", "published"] as const;
export type LandingStatus = (typeof LANDING_STATUSES)[number];

/** Money in GM pages defaults to Indian rupees. */
export const GM_DEFAULT_CURRENCY = "INR";

export interface GmCourse {
  id: string;
  account_id: string;
  name: string;
  batch: string;
  fee: number;
  currency: string;
  status: "active" | "archived";
  created_at: string;
}

export interface GmContactRef {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
}

export interface GmLeadProfile {
  id: string;
  account_id: string;
  contact_id: string;
  course_id: string | null;
  lead_status: LeadStatus;
  source: string;
  area: string;
  follow_up_date: string | null;
  enrolled_at: string | null;
  created_at: string;
  updated_at: string;
  contact?: GmContactRef | null;
  course?: Pick<GmCourse, "id" | "name" | "batch" | "fee" | "currency"> | null;
}

export interface GmActivity {
  id: string;
  account_id: string;
  title: string;
  activity_type: ActivityType;
  due_date: string;
  due_time: string | null;
  contact_id: string | null;
  assigned_to: string | null;
  notes: string;
  done: boolean;
  created_at: string;
  contact?: Pick<GmContactRef, "id" | "name" | "phone"> | null;
}

export interface GmPayment {
  id: string;
  account_id: string;
  contact_id: string | null;
  payer_name: string;
  course_id: string | null;
  amount: number;
  currency: string;
  paid_on: string;
  method: string;
  reference: string;
  status: PaymentStatus;
  created_at: string;
  course?: Pick<GmCourse, "id" | "name" | "batch"> | null;
}

export interface GmExpense {
  id: string;
  account_id: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  spent_on: string;
  status: ExpenseStatus;
  created_at: string;
}

export interface GmChannelLog {
  id: string;
  account_id: string;
  contact_id: string | null;
  contact_name: string;
  channel: Channel;
  direction: Direction;
  subject: string;
  summary: string;
  occurred_at: string;
  created_at: string;
  contact?: Pick<GmContactRef, "id" | "name" | "phone" | "email"> | null;
}

export interface GmCertificate {
  id: string;
  account_id: string;
  contact_id: string;
  course_id: string | null;
  recipient_name: string;
  course_name: string;
  certificate_no: string;
  issued_on: string;
  created_at: string;
}

export interface GmLandingPage {
  id: string;
  account_id: string;
  course_id: string | null;
  course_name: string;
  batch_label: string;
  location: string;
  promise: string;
  cta_url: string;
  status: LandingStatus;
  created_at: string;
  updated_at: string;
}

export interface GmAuditEntry {
  id: number;
  account_id: string;
  user_id: string | null;
  action: "create" | "update" | "delete";
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

/** Display name for a contact, falling back to its phone. */
export function contactLabel(c: { name?: string | null; phone?: string | null } | null | undefined): string {
  if (!c) return "";
  return (c.name && c.name.trim()) || c.phone || "";
}
