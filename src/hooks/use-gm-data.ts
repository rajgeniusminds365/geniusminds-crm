"use client";

/**
 * Data hooks for the GeniusMinds (GM) pages.
 *
 * Origin: GeniusMindsCRM-Complete loaded everything through
 * `/api/data` and refreshed on server-sent events. Here each page
 * reads its own account-scoped table through the Supabase browser
 * client (RLS enforces membership) and refreshes on Supabase Realtime
 * changes (migration 066 publishes the gm_* tables).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { hasMinRole } from "@/lib/auth/roles";
import type { GmSnapshot } from "@/lib/gm/insights";
import type {
  GmActivity,
  GmCourse,
  GmExpense,
  GmLeadProfile,
  GmPayment,
} from "@/lib/gm/types";

export const GM_SELECT = {
  leads:
    "*, contact:contacts(id, name, phone, email), course:gm_courses(id, name, batch, fee, currency)",
  activities: "*, contact:contacts(id, name, phone)",
  payments: "*, course:gm_courses(id, name, batch)",
  channelLogs: "*, contact:contacts(id, name, phone, email)",
} as const;

interface RowsOptions {
  select?: string;
  order?: string;
  ascending?: boolean;
  limit?: number;
  /** Extra equality filters, e.g. { channel: "email" }. */
  eq?: Record<string, string | boolean>;
  /** Subscribe to realtime changes on the table (default true). */
  realtime?: boolean;
}

export interface RowsState<T> {
  rows: T[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useGmRows<T>(table: string, options: RowsOptions = {}): RowsState<T> {
  const { accountId } = useAuth();
  const { select = "*", order = "created_at", ascending = false, limit = 1000, realtime = true } = options;
  const eqKey = JSON.stringify(options.eq ?? {});
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    if (!accountId) return;
    const supabase = createClient();
    let q = supabase.from(table).select(select).eq("account_id", accountId);
    for (const [k, v] of Object.entries(JSON.parse(eqKey) as Record<string, string | boolean>)) q = q.eq(k, v);
    const { data, error: err } = await q.order(order, { ascending }).limit(limit);
    if (err) setError(err.message);
    else {
      setError(null);
      setRows((data ?? []) as T[]);
    }
    setLoading(false);
  }, [accountId, table, select, order, ascending, limit, eqKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  useEffect(() => {
    if (!accountId || !realtime) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`gm:${table}:${accountId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `account_id=eq.${accountId}` },
        () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void reload(), 250);
        },
      )
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [accountId, table, realtime, reload]);

  return { rows, loading, error, reload };
}

/** Everything the GM analytics / intelligence / assistant views need. */
export function useGmSnapshot(): { data: GmSnapshot; loading: boolean; error: string | null; reload: () => Promise<void> } {
  const leads = useGmRows<GmLeadProfile>("gm_lead_profiles", { select: GM_SELECT.leads });
  const courses = useGmRows<GmCourse>("gm_courses", { order: "name", ascending: true });
  const activities = useGmRows<GmActivity>("gm_activities", { select: GM_SELECT.activities, order: "due_date", ascending: true });
  const payments = useGmRows<GmPayment>("gm_payments", { select: GM_SELECT.payments, order: "paid_on" });
  const expenses = useGmRows<GmExpense>("gm_expenses", { order: "spent_on" });
  const all = [leads, courses, activities, payments, expenses];
  const reloadAll = useCallback(async () => {
    await Promise.all(all.map((s) => s.reload()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads.reload, courses.reload, activities.reload, payments.reload, expenses.reload]);
  return {
    data: {
      leads: leads.rows,
      courses: courses.rows,
      activities: activities.rows,
      payments: payments.rows,
      expenses: expenses.rows,
    },
    loading: all.some((s) => s.loading),
    error: all.map((s) => s.error).find(Boolean) ?? null,
    reload: reloadAll,
  };
}

/** Agent and above may write GM records (mirrors the RLS policies). */
export function useGmCanEdit(): boolean {
  const { profileLoading, accountRole } = useAuth();
  return !profileLoading && !!accountRole && hasMinRole(accountRole, "agent");
}

/** Admin and above: approve expenses, delete courses/certificates, audit log. */
export function useGmIsAdmin(): boolean {
  const { profileLoading, accountRole } = useAuth();
  return !profileLoading && !!accountRole && hasMinRole(accountRole, "admin");
}
