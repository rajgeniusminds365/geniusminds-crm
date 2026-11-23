"use client";

/**
 * Media storage — origin: GeniusMindsCRM-Complete ("MARKETING › Media
 * Storage": upload course marketing assets). Files live in the private
 * Supabase Storage bucket `gm-media` under account-<id>/ (migration 064).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useGmCanEdit } from "@/hooks/use-gm-data";
import { Button } from "@/components/ui/button";
import { GmCard, GmEmpty, GmError, GmLoading, GmPageHeader } from "@/components/gm/gm-ui";

const BUCKET = "gm-media";
const MAX_BYTES = 25 * 1024 * 1024;

interface MediaItem { name: string; path: string; size: number; type: string; created: string; url: string | null }

export default function MediaPage() {
  const t = useTranslations("GM.media");
  const c = useTranslations("GM.common");
  const { accountId } = useAuth();
  const canEdit = useGmCanEdit();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const folder = accountId ? `account-${accountId}` : null;

  const load = useCallback(async () => {
    if (!folder) return;
    const storage = createClient().storage.from(BUCKET);
    const { data, error: err } = await storage.list(folder, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const files = (data ?? []).filter((f) => f.id && !f.name.startsWith("."));
    const paths = files.map((f) => `${folder}/${f.name}`);
    const signed = paths.length ? (await storage.createSignedUrls(paths, 3600)).data ?? [] : [];
    setItems(
      files.map((f, i) => ({
        name: f.name.replace(/^\d+-/, ""),
        path: paths[i]!,
        size: Number(f.metadata?.size ?? 0),
        type: String(f.metadata?.mimetype ?? ""),
        created: f.created_at ?? "",
        url: signed[i]?.signedUrl ?? null,
      })),
    );
    setError(null);
    setLoading(false);
  }, [folder]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function upload(files: FileList | File[]) {
    if (!folder || !canEdit) return;
    setUploading(true);
    const storage = createClient().storage.from(BUCKET);
    let ok = 0;
    for (const f of Array.from(files)) {
      if (f.size > MAX_BYTES) {
        toast.error(t("tooBig", { name: f.name }));
        continue;
      }
      const safe = f.name.replace(/[^\w.\-]+/g, "_").slice(-120);
      const { error: err } = await storage.upload(`${folder}/${Date.now()}-${safe}`, f, { contentType: f.type || undefined });
      if (err) toast.error(`${f.name}: ${err.message}`);
      else ok++;
    }
    setUploading(false);
    if (ok) toast.success(t("uploaded", { count: ok }));
    load();
  }

  async function remove(item: MediaItem) {
    if (!confirm(c("confirmDelete"))) return;
    const { error: err } = await createClient().storage.from(BUCKET).remove([item.path]);
    if (err) toast.error(err.message);
    else load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <GmPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      {error && <GmError message={error} />}
      {canEdit && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); void upload(e.dataTransfer.files); }}
          className={`mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${drag ? "border-primary bg-primary/10" : "border-border"}`}
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-primary" />}
          <p className="text-sm text-foreground">{t("drop")}</p>
          <p className="text-xs text-muted-foreground">{t("limits")}</p>
          <Button variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>{t("choose")}</Button>
          <input ref={inputRef} type="file" multiple hidden accept="image/*,video/mp4,application/pdf" onChange={(e) => e.target.files && void upload(e.target.files)} />
        </div>
      )}
      <GmCard>
        {loading ? (
          <GmLoading />
        ) : items.length === 0 ? (
          <GmEmpty title={t("emptyTitle")} body={t("emptyBody")} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((it) => (
              <div key={it.path} className="overflow-hidden rounded-lg border border-border">
                <div className="flex h-32 items-center justify-center bg-muted">
                  {it.type.startsWith("image/") && it.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.url} alt={it.name} className="h-full w-full object-cover" />
                  ) : (
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-1 p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-foreground" title={it.name}>{it.name}</div>
                    <div className="text-[10px] text-muted-foreground">{(it.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  {it.url && (
                    <a href={it.url} target="_blank" rel="noreferrer" aria-label={t("download")} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Download className="h-3.5 w-3.5" /></a>
                  )}
                  {canEdit && (
                    <button type="button" aria-label={c("delete")} onClick={() => remove(it)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GmCard>
    </div>
  );
}
