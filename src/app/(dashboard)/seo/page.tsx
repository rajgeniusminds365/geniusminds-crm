"use client";

/**
 * SEO pipeline — origin: GeniusMindsCRM-Complete ("MARKETING › SEO
 * pipeline"). GM shipped this as a title-only placeholder and wacrm
 * has no SEO feature, so per the merge rules (only features from
 * either project) nothing is invented here. Course pages for search
 * and sharing are built under Landing pages.
 */
import Link from "next/link";
import { useTranslations } from "next-intl";
import { GmCard, GmPageHeader } from "@/components/gm/gm-ui";

export default function SeoPage() {
  const t = useTranslations("GM.seo");
  return (
    <div className="mx-auto max-w-3xl">
      <GmPageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <GmCard>
        <h3 className="text-sm font-semibold text-foreground">{t("notBuiltTitle")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("notBuiltBody")}</p>
        <Link href="/landing-pages" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">{t("goLanding")} →</Link>
      </GmCard>
    </div>
  );
}
