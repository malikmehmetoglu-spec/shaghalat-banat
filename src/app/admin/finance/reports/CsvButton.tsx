"use client";
/** تصدير CSV يفتح في Excel (مع BOM لدعم العربية) */
export function CsvButton({ rows, name }: { rows: (string | number)[][]; name: string }) {
  return (
    <button type="button" className="btn" onClick={() => {
      const text = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(url);
    }}>تصدير Excel</button>
  );
}
