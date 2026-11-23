/** Standalone course landing page HTML (GM "Course landing page builder"). */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface LandingContent {
  org: string;
  eyebrow: string;
  course: string;
  promise: string;
  batch: string;
  location: string;
  cta: string;
  contactHref: string;
}

/** Only allow safe link schemes in the generated page. */
export function safeCtaUrl(url: string): string {
  const u = url.trim();
  return /^(https?:\/\/|mailto:|tel:)/i.test(u) ? u : "";
}

export function landingHtml(content: LandingContent): string {
  content = { ...content, contactHref: safeCtaUrl(content.contactHref) };
  const c = Object.fromEntries(Object.entries(content).map(([k, v]) => [k, esc(v)])) as unknown as LandingContent;
  const meta = [c.batch, c.location].filter(Boolean).join(" · ");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${c.course}</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f6fdf8;color:#0f2a19}
.hero{background:linear-gradient(130deg,#14532d,#22c55e 70%,#86efac);color:#fff;padding:72px 24px}
.w{max-width:880px;margin:0 auto}
.e{font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.9}
h1{font-size:44px;line-height:1.1;margin:14px 0}
p{font-size:19px;max-width:620px}
.m{font-weight:600;opacity:.95}
a.b{display:inline-block;margin-top:22px;background:#fff;color:#14532d;padding:12px 22px;border-radius:10px;font-weight:700;text-decoration:none}
</style></head><body><section class="hero"><div class="w">
<div class="e">${c.org ? `${c.org} · ` : ""}${c.eyebrow}</div>
<h1>${c.course}</h1>${c.promise ? `<p>${c.promise}</p>` : ""}${meta ? `<div class="m">${meta}</div>` : ""}
${c.contactHref ? `<a class="b" href="${c.contactHref}">${c.cta} →</a>` : ""}
</div></section></body></html>`;
}
