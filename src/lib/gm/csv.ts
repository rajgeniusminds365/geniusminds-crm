/**
 * CSV export helpers (GM "Export report", "Download CSV",
 * "Generate report" buttons).
 */

/** Neutralise spreadsheet formula injection and quote as needed. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}

/** Browser-only: trigger a download of CSV text. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Split one CSV line, honouring double-quoted cells. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export interface LeadImportRow {
  name: string;
  phone: string;
  email: string;
  course: string;
  area: string;
  status: string;
  source: string;
}

/**
 * GM lead import: columns named name, phone, email, course, area,
 * status and source map automatically (same contract as GM's
 * /api/import). Header names are case-insensitive. Rows without a
 * phone are kept so the caller can report them as skipped.
 */
export function parseLeadCsv(text: string): { rows: LeadImportRow[]; hasPhoneColumn: boolean } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], hasPhoneColumn: false };
  const headers = parseCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const idx = (k: string) => headers.indexOf(k);
  if (idx("phone") === -1) return { rows: [], hasPhoneColumn: false };
  const get = (cells: string[], k: string) => (idx(k) >= 0 ? cells[idx(k)] ?? "" : "");
  const rows = lines.slice(1).map((l) => {
    const cells = parseCsvLine(l);
    return {
      name: get(cells, "name"),
      phone: get(cells, "phone"),
      email: get(cells, "email"),
      course: get(cells, "course"),
      area: get(cells, "area"),
      status: get(cells, "status").toLowerCase(),
      source: get(cells, "source"),
    };
  });
  return { rows, hasPhoneColumn: true };
}
