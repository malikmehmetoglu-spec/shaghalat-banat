/** هيكل تحميل فوري يظهر لحظة الضغط ريثما تصل بيانات الصفحة */
export function PageSkeleton({ admin = false }: { admin?: boolean }) {
  const bar = (w: string, h = 14) => <div className="skel" style={{ width: w, height: h }} />;
  return (
    <div aria-busy="true" aria-label="جارٍ التحميل" style={{ padding: admin ? 24 : 16, display: "flex", flexDirection: "column", gap: 14 }}>
      {bar("40%", 26)}
      {bar("65%")}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginTop: 8 }}>
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="skel" style={{ height: admin ? 90 : 210, borderRadius: 18 }} />)}
      </div>
      <style>{`.skel{border-radius:10px;background:linear-gradient(90deg,rgba(142,2,84,.07) 25%,rgba(142,2,84,.14) 50%,rgba(142,2,84,.07) 75%);background-size:200% 100%;animation:skel 1.2s ease-in-out infinite}@keyframes skel{to{background-position:-200% 0}}@media (prefers-reduced-motion:reduce){.skel{animation:none}}`}</style>
    </div>
  );
}
