"use client";

/**
 * Post ideas — origin: GeniusMindsCRM-Complete ("MARKETING › Post
 * Ideas"). Same three GM templates filled with your subject
 * (src/lib/gm/post-ideas.ts), plus copy buttons. English only, as in GM.
 */
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GmCard, GmField, GmPageHeader } from "@/components/gm/gm-ui";
import { generatePostIdeas } from "@/lib/gm/post-ideas";

export default function PostIdeasPage() {
  const t = useTranslations("GM.ideas");
  const [subject, setSubject] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);

  function generate(e: FormEvent) {
    e.preventDefault();
    setIdeas(generatePostIdeas(subject));
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <GmPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <GmCard>
        <form onSubmit={generate} className="space-y-3">
          <GmField label={t("subjectLabel")}>
            <Textarea rows={3} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("subjectHint")} />
          </GmField>
          <p className="text-xs text-muted-foreground">{t("englishOnly")}</p>
          <Button type="submit"><Sparkles className="h-4 w-4" /> {t("generate")}</Button>
        </form>
        {ideas.length > 0 && (
          <div className="mt-4 space-y-2">
            {ideas.map((idea, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
                <span className="font-semibold text-primary">{i + 1}.</span>
                <p className="flex-1">{idea}</p>
                <Button size="icon-sm" variant="ghost" aria-label={t("copy")} onClick={() => copy(idea)}><Copy className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
      </GmCard>
    </div>
  );
}
