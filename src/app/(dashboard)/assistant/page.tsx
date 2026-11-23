"use client";

/**
 * Web Chat Assistant ("Gro") — origin: GeniusMindsCRM-Complete
 * ("GROWTH › Web Chat Assistant"). Same rules-based answers as GM's
 * server (ported to src/lib/gm/assistant.ts) over live account data.
 * No external AI service. For AI replies to WhatsApp customers, use
 * wacrm's AI Agents.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, CalendarClock, IndianRupee, SendHorizontal, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGmSnapshot } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GmCard, GmCardHead, GmError, GmPageHeader } from "@/components/gm/gm-ui";
import { answerCrmQuestion } from "@/lib/gm/assistant";
import { todayIso } from "@/lib/gm/format";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "bot"; text: string }

export default function AssistantPage() {
  const t = useTranslations("GM.assistant");
  const c = useTranslations("GM.common");
  const { profile } = useAuth();
  const { data, loading, error } = useGmSnapshot();
  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const suggestions = [t("s1"), t("s2"), t("s3"), t("s4")];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs]);

  function ask(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    setMsgs((m) => [...m, { role: "user", text: question }, { role: "bot", text: answerCrmQuestion(data, question, todayIso()) }]);
    setQ("");
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    ask(q);
  }

  const help = [
    { icon: Users, k: "helpLearners" },
    { icon: CalendarClock, k: "helpAdmissions" },
    { icon: IndianRupee, k: "helpPayments" },
    { icon: BookOpen, k: "helpCourses" },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl">
      <GmPageHeader eyebrow={c("eyebrowWorkspace")} title={t("title")} description={t("description")} />
      {error && <GmError message={error} />}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <GmCard className="flex min-h-[480px] flex-col">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary"><Sparkles className="h-4 w-4" /></span>
            <div>
              <b className="text-sm text-foreground">{t("botName")}</b>
              <div className="text-xs text-muted-foreground">{t("botSub")}</div>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" /> {loading ? c("loading") : t("online")}
            </span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto py-4">
            <div className="max-w-[85%] rounded-xl bg-muted px-3 py-2 text-sm text-foreground">{t("greeting", { name: firstName || t("there") })}</div>
            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button key={s} type="button" onClick={() => ask(s)} disabled={loading} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/20">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-sm",
                  m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={submit} className="flex gap-2 border-t border-border pt-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("placeholder")} autoComplete="off" />
            <Button type="submit" size="icon" disabled={loading || !q.trim()} aria-label={t("send")}><SendHorizontal className="h-4 w-4" /></Button>
          </form>
        </GmCard>
        <GmCard>
          <GmCardHead title={t("helpTitle")} description={t("helpSub")} />
          {help.map(({ icon: Icon, k }) => (
            <div key={k} className="flex gap-3 border-b border-border py-2.5 last:border-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-4 w-4" /></span>
              <div>
                <b className="text-sm text-foreground">{t(`${k}.title`)}</b>
                <p className="text-xs text-muted-foreground">{t(`${k}.body`)}</p>
              </div>
            </div>
          ))}
        </GmCard>
      </div>
    </div>
  );
}
