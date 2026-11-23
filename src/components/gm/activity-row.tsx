"use client";

/** One GM activity line with done / edit / delete controls. */
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarClock, Check, Pencil, Phone, RotateCcw, Trash2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GmPill } from "./gm-ui";
import { formatDay } from "@/lib/gm/format";
import { contactLabel, type GmActivity } from "@/lib/gm/types";

const ICONS = { call: Phone, meeting: Users, follow_up: CalendarClock } as const;

export function ActivityRow({
  activity,
  canEdit,
  onEdit,
  onChanged,
}: {
  activity: GmActivity;
  canEdit: boolean;
  onEdit: (a: GmActivity) => void;
  onChanged: () => void;
}) {
  const t = useTranslations("GM.activities");
  const c = useTranslations("GM.common");
  const Icon = ICONS[activity.activity_type] ?? CalendarClock;

  async function toggle() {
    const { error } = await createClient().from("gm_activities").update({ done: !activity.done }).eq("id", activity.id);
    if (error) toast.error(error.message);
    else onChanged();
  }
  async function remove() {
    if (!confirm(c("confirmDelete"))) return;
    const { error } = await createClient().from("gm_activities").delete().eq("id", activity.id);
    if (error) toast.error(error.message);
    else {
      toast.success(c("deleted"));
      onChanged();
    }
  }

  return (
    <div className="flex items-center gap-3 border-b border-border py-2.5 last:border-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className={activity.done ? "truncate text-sm text-muted-foreground line-through" : "truncate text-sm font-medium text-foreground"}>
          {activity.title}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {t(`type.${activity.activity_type}`)} · {formatDay(activity.due_date)}
          {activity.due_time ? ` · ${activity.due_time.slice(0, 5)}` : ""}
          {activity.contact ? ` · ${contactLabel(activity.contact)}` : ""}
        </div>
      </div>
      {activity.done && <GmPill tone="green">{t("done")}</GmPill>}
      {canEdit && (
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon-sm" variant="ghost" aria-label={activity.done ? t("markOpen") : t("markDone")} title={activity.done ? t("markOpen") : t("markDone")} onClick={toggle}>
            {activity.done ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={c("edit")} onClick={() => onEdit(activity)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={c("delete")} onClick={remove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
