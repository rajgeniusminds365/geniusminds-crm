/** Printable certificate page (opened in a new tab and printed / saved as PDF). */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function certificateHtml(opts: {
  heading: string;
  presented: string;
  recipient: string;
  completed: string;
  course: string;
  issuedLabel: string;
  issuedOn: string;
  numberLabel: string;
  number: string;
  org: string;
}): string {
  const o = Object.fromEntries(Object.entries(opts).map(([k, v]) => [k, esc(v)])) as typeof opts;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${o.number}</title>
<style>
@page{size:A4 landscape;margin:0}
body{margin:0;font-family:Georgia,'Times New Roman',serif;background:#f3fbf5;color:#14361f}
.c{box-sizing:border-box;width:297mm;height:210mm;padding:22mm;border:10px solid #4ade80;outline:2px solid #14532d;outline-offset:-22px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.o{letter-spacing:.3em;font-size:12px;text-transform:uppercase;color:#15803d}
h1{font-size:44px;margin:16px 0 8px}
.p{font-size:16px;margin:18px 0 4px}
.r{font-size:34px;font-weight:bold;border-bottom:2px solid #4ade80;padding:0 24px 6px;margin:6px 0 14px}
.k{font-size:20px;font-style:italic}
.f{margin-top:40px;display:flex;gap:80px;font-size:13px;color:#166534}
</style></head><body><div class="c">
<div class="o">${o.org}</div><h1>${o.heading}</h1>
<div class="p">${o.presented}</div><div class="r">${o.recipient}</div>
<div class="p">${o.completed}</div><div class="k">${o.course}</div>
<div class="f"><div>${o.issuedLabel}: ${o.issuedOn}</div><div>${o.numberLabel}: ${o.number}</div></div>
</div><script>window.onload=function(){window.print()}</script></body></html>`;
}
