"use client";

/**
 * Email and Calls pages — origin: GeniusMindsCRM-Complete
 * ("COMMUNICATION › Email / Calls"). GM listed messages by channel
 * and dialled with tel: links; neither project has an email or
 * telephony provider, so this keeps a shared log (gm_channel_logs,
 * migration 063) and hands off to the device's mail / phone app.
 * WhatsApp conversations live in wacrm's Inbox.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Mail, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { GM_SELECT, useGmCanEdit, useGmRows } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GmFormDialog } from "./form-dialog";
import { GmCard, GmEmpty, GmError, GmField, GmLoading, GmPageHeader, GmSelect } from "./gm-ui";
import { ContactPicker } from "./contact-picker";
import { contactLabel, DIRECTIONS, type Channel, type Direction, type GmChannelLog, type GmContactRef } from "@/lib/gm/types";

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function LogDialog({ channel, log, onClose, onSaved }: { channel: Channel; log: GmChannelLog | null; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations(`GM.${channel === "email" ? "email" : "calls"}`);
  const ch = useTranslations("GM.channel");
  const { accountId } = useAuth();
  const [contact, setContact] = useState<GmContactRef | null>(log?.contact ? { ...log.contact, email: log.contact.email ?? null } : null);
  const [name, setName] = useState(log?.contact_name ?? "");
  const [direction, setDirection] = useState<Direction>(log?.direction ?? "outbound");
  const [subject, setSubject] = useState(log?.subject ?? "");
  const [summary, setSummary] = useState(log?.summary ?? "");
  const [when, setWhen] = useState(toLocalInput(log?.occurred_at ?? new Date().toISOString()));
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!accountId) return;
    const display = (contact ? contactLabel(contact) : "") || name.trim();
    if (!display) return void toast.error(ch("contactRequired"));
    setBusy(true);
    const payload = {
      account_id: accountId,
      channel,
      contact_id: contact?.id ?? null,
      contact_name: display,
      direction,
      subject: subject.trim(),
      summary: summary.trim(),
      occurred_at: new Date(when).toISOString(),
    };
    const db = createClient();
    const { error } = log ? await db.from("gm_channel_logs").update(payload).eq("id", log.id) : await db.from("gm_channel_logs").insert(payload);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(ch("saved"));
    onClose();
    onSaved();
    if (!log && direction === "outbound") {
      if (channel === "email" && contact?.email) {
        window.location.href = `mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summary)}`;
      } else if (channel === "call" && contact?.phone) {
        window.location.href = `tel:${contact.phone.replace(/[^\d+]/g, "")}`;
      }
    }
  }

  return (
    <GmFormDialog open onOpenChange={(o) => !o && onClose()} title={log ? t("editTitle") : t("addTitle")} description={log ? undefined : t("addHint")} busy={busy} onSubmit={save}>
      <GmField label={ch("contact")} wide>
        <ContactPicker value={contact} onChange={setContact} />
      </GmField>
      {!contact && (
        <GmField label={ch("nameIfNoContact")} wide>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </GmField>
      )}
      <GmField label={ch("direction")}>
        <GmSelect value={direction} onChange={(v) => setDirection(v as Direction)} options={DIRECTIONS.map((d) => ({ value: d, label: ch(`dir.${d}`) }))} />
      </GmField>
      <GmField label={ch("when")}>
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
      </GmField>
      <GmField label={t("subjectLabel")} wide>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </GmField>
      <GmField label={t("summaryLabel")} wide>
        <Textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </GmField>
    </GmFormDialog>
  );
}

export function ChannelLogPage({ channel }: { channel: Channel }) {
  const t = useTranslations(`GM.${channel === "email" ? "email" : "calls"}`);
  const ch = useTranslations("GM.channel");
  const c = useTranslations("GM.common");
  const canEdit = useGmCanEdit();
  const { rows, loading, error, reload } = useGmRows<GmChannelLog>("gm_channel_logs", { select: GM_SELECT.channelLogs, eq: { channel }, order: "occurred_at" });
  const [dialog, setDialog] = useState<{ log: GmChannelLog | null } | null>(null);
  const Icon = channel === "email" ? Mail : Phone;

  async function remove(log: GmChannelLog) {
    if (!confirm(c("confirmDelete"))) return;
    const { error: err } = await createClient().from("gm_channel_logs").delete().eq("id", log.id);
    if (err) toast.error(err.message);
    else reload();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <GmPageHeader
        eyebrow={ch("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={canEdit && <Button onClick={() => setDialog({ log: null })}><Plus className="h-4 w-4" /> {t("add")}</Button>}
      />
      {error && <GmError message={error} />}
      <GmCard>
        {loading ? (
          <GmLoading />
        ) : rows.length === 0 ? (
          <GmEmpty title={t("emptyTitle")} body={t("emptyBody")} />
        ) : (
          rows.map((log) => {
            const phone = log.contact?.phone;
            const email = log.contact?.email;
            return (
              <div key={log.id} className="flex items-start gap-3 border-b border-border py-3 last:border-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <b className="truncate text-sm text-foreground">{log.contact_name || contactLabel(log.contact)}</b>
                    {log.direction === "inbound" ? <ArrowDownLeft className="h-3.5 w-3.5 text-muted-foreground" /> : <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground">{ch(`dir.${log.direction}`)}</span>
                  </div>
                  {log.subject && <div className="truncate text-sm text-foreground">{log.subject}</div>}
                  {log.summary && <div className="line-clamp-2 text-xs text-muted-foreground">{log.summary}</div>}
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">{new Date(log.occurred_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time>
                <div className="flex shrink-0 gap-1">
                  {channel === "call" && phone && (
                    <Button size="icon-sm" variant="ghost" aria-label={ch("callNow")} title={ch("callNow")} onClick={() => (window.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`)}><Phone className="h-3.5 w-3.5" /></Button>
                  )}
                  {channel === "email" && email && (
                    <Button size="icon-sm" variant="ghost" aria-label={ch("emailNow")} title={ch("emailNow")} onClick={() => (window.location.href = `mailto:${encodeURIComponent(email)}`)}><Mail className="h-3.5 w-3.5" /></Button>
                  )}
                  {canEdit && (
                    <>
                      <Button size="icon-sm" variant="ghost" aria-label={c("edit")} onClick={() => setDialog({ log })}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label={c("delete")} onClick={() => remove(log)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </GmCard>
      {dialog && <LogDialog channel={channel} log={dialog.log} onClose={() => setDialog(null)} onSaved={reload} />}
    </div>
  );
}
