"use client";
import { useMemo, useState, useTransition } from "react";
import { applyCount, type ActionResult } from "../../actions";

type Line = { id: string; name: string; label: string; sku: string; barcode: string | null; system: number };

export function CountSheet({ locationId, locationName, lines }: { locationId: string; locationName: string; lines: Line[] }) {
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [scan, setScan] = useState("");
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const diffs = useMemo(() => lines.filter((l) => counts[l.id] !== undefined && counts[l.id] !== "" && Number(counts[l.id]) !== l.system), [lines, counts]);
  const done = lines.filter((l) => counts[l.id] !== undefined && counts[l.id] !== "").length;

  function onScan(e: React.FormEvent) {
    e.preventDefault();
    const code = scan.trim();
    const l = lines.find((x) => x.barcode === code || x.sku === code);
    if (!l) { setMsg({ ok: false, message: `الرمز ${code} غير معروف` }); return; }
    setCounts((c) => ({ ...c, [l.id]: String(Number(c[l.id] || 0) + 1) }));
    setMsg({ ok: true, message: `+1 ${l.name} ${l.label}` });
    setScan("");
  }

  return (
    <>
      <div className="acard" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
        <form onSubmit={onScan} style={{ display: "flex", gap: 8, flex: "1 1 300px" }}>
          <label className="sr" htmlFor="scan">مسح الباركود</label>
          <input id="scan" value={scan} onChange={(e) => setScan(e.target.value)} className="a-in ltr" placeholder="امسحي الباركود أو اكتبي SKU" style={{ flex: 1 }} autoFocus />
          <button className="btn secondary" type="submit">+1</button>
        </form>
        <span className="adm-sub">{locationName} · تم عدّ {done} من {lines.length} · {diffs.length} فروقات</span>
        <button className="btn" disabled={pending || !done} onClick={() => start(async () => {
          const r = await applyCount(locationId, lines.filter((l) => counts[l.id] !== undefined && counts[l.id] !== "").map((l) => ({ variantId: l.id, qty: Number(counts[l.id]) })), `جرد ${locationName}`);
          setMsg(r); if (r.ok) setCounts({});
        })}>{pending ? "جارٍ الاعتماد…" : "اعتماد الجرد"}</button>
      </div>
      {msg && <span className={`a-flash ${msg.ok ? "tone-success" : "tone-danger"}`}>{msg.message}</span>}
      <div className="acard flush">
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>المنتج</th><th>SKU</th><th style={{ textAlign: "center" }}>في النظام</th><th style={{ textAlign: "center" }}>العدد الفعلي</th><th style={{ textAlign: "center" }}>الفرق</th></tr></thead>
            <tbody>
              {lines.map((l) => {
                const v = counts[l.id];
                const d = v === undefined || v === "" ? null : Number(v) - l.system;
                return (
                  <tr key={l.id}>
                    <td>{l.name}<div className="caption">{l.label}</div></td>
                    <td className="caption ltr" style={{ textAlign: "right" }}>{l.sku}</td>
                    <td style={{ textAlign: "center" }}>{l.system}</td>
                    <td style={{ textAlign: "center" }}><input aria-label={`عدد ${l.sku}`} className="a-in cnt-in" type="number" min="0" value={v ?? ""} onChange={(e) => setCounts((c) => ({ ...c, [l.id]: e.target.value }))} /></td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: d ? (d > 0 ? "var(--success, #1a7f4b)" : "var(--magenta)") : "inherit" }}>{d === null ? "—" : d > 0 ? `+${d}` : d}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
