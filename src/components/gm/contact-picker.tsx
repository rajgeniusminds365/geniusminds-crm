"use client";

/**
 * Pick a wacrm contact for a GM record (lead, payment, activity,
 * certificate, call/email log). GM leads and students ARE wacrm
 * contacts, so every GM record links back to the same person and
 * their WhatsApp conversation. Optionally creates a new contact.
 */
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Search, UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { contactSearchFilter } from "@/lib/contacts/search-filter";
import { contactLabel, type GmContactRef } from "@/lib/gm/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ContactPicker({
  value,
  onChange,
  allowCreate = false,
  disabled,
}: {
  value: GmContactRef | null;
  onChange: (c: GmContactRef | null) => void;
  allowCreate?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("GM.contactPicker");
  const { accountId, user } = useAuth();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<GmContactRef[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId || value) return;
    const handle = setTimeout(async () => {
      const supabase = createClient();
      let q = supabase.from("contacts").select("id, name, phone, email").eq("account_id", accountId);
      const filter = term.trim() ? contactSearchFilter(term, { includeEmail: true }) : null;
      if (filter) q = q.or(filter);
      const { data } = await q.order("name", { ascending: true }).limit(20);
      setResults((data ?? []) as GmContactRef[]);
    }, 200);
    return () => clearTimeout(handle);
  }, [term, accountId, value]);

  async function create() {
    if (!accountId || !user) return;
    if (!newPhone.trim()) {
      setError(t("phoneRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        account_id: accountId,
        name: newName.trim() || null,
        phone: newPhone.trim(),
        email: newEmail.trim() || null,
      })
      .select("id, name, phone, email")
      .single();
    setBusy(false);
    if (err) {
      setError(err.code === "23505" ? t("duplicate") : err.message);
      return;
    }
    onChange(data as GmContactRef);
    setCreating(false);
  }

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate font-medium text-foreground">{contactLabel(value)}</span>
          <span className="truncate text-xs text-muted-foreground">{value.phone}</span>
        </span>
        {!disabled && (
          <button type="button" aria-label={t("clear")} onClick={() => onChange(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  if (creating) {
    return (
      <div className="space-y-2 rounded-lg border border-border p-2.5">
        <Input placeholder={t("name")} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <Input placeholder={t("phone")} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
        <Input placeholder={t("email")} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" size="sm" disabled={busy} onClick={create}>
            {t("createContact")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border px-2.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder={t("search")}
          value={term}
          disabled={disabled}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
      <ul className="max-h-40 overflow-y-auto py-1">
        {results.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(c)}
              className={cn("flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted")}
            >
              <span className="truncate text-foreground">{contactLabel(c)}</span>
              <span className="truncate text-xs text-muted-foreground">{c.phone}</span>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="px-2.5 py-2 text-xs text-muted-foreground">{t("noResults")}</li>}
      </ul>
      {allowCreate && !disabled && (
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setNewName(term.trim() && !/\d/.test(term) ? term.trim() : "");
            setNewPhone(/\d/.test(term) ? term.trim() : "");
          }}
          className="flex w-full items-center gap-2 border-t border-border px-2.5 py-2 text-xs font-medium text-primary hover:bg-primary/10"
        >
          <UserPlus className="h-3.5 w-3.5" /> {t("newContact")}
        </button>
      )}
    </div>
  );
}
