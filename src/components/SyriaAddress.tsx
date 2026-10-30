"use client";
import { useEffect, useState } from "react";
import { OTHER_AREA, SYRIA, joinCity, splitCity } from "@/lib/syria";
import { useT } from "./LangProvider";

/** اختيار العنوان: المحافظة ← المنطقة (أولها مركز المدينة) ← ثم العنوان التفصيلي في حقل منفصل */
export function SyriaAddress({ city, onChange }: { city: string; onChange: (city: string) => void }) {
  const t = useT();
  const init = splitCity(city);
  const [gov, setGov] = useState(init.gov);
  const g = SYRIA.find((x) => x.gov === gov);
  const known = !!g && (init.area === g.center || g.areas.includes(init.area));
  const [area, setArea] = useState(init.gov && init.area ? (known ? init.area : OTHER_AREA) : "");
  const [other, setOther] = useState(init.gov && init.area && !known ? init.area : "");

  useEffect(() => {
    const a = area === OTHER_AREA ? other.trim() : area;
    onChange(gov && a ? joinCity(gov, a) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gov, area, other]);

  return (
    <div className="sa">
      <label className="field">{t("المحافظة")}
        <span className="sa-sel">
          <select className="input" value={gov} onChange={(e) => { setGov(e.target.value); setArea(""); setOther(""); }}>
            <option value="" disabled>{t("اختاري المحافظة")}</option>
            {SYRIA.map((x) => <option key={x.gov} value={x.gov}>{x.gov}</option>)}
          </select>
        </span>
      </label>
      {g && (
        <label className="field">{t("المنطقة")}
          <span className="sa-sel">
            <select className="input" value={area} onChange={(e) => setArea(e.target.value)}>
              <option value="" disabled>{t("اختاري المنطقة")}</option>
              {g.center && <optgroup label={t("المدينة")}><option value={g.center} className="sa-center">★ {g.center}</option></optgroup>}
              <optgroup label={t("المناطق والأحياء")}>
                {g.areas.map((a) => <option key={a} value={a}>{a}</option>)}
              </optgroup>
              <option value={OTHER_AREA}>{t("منطقة أخرى…")}</option>
            </select>
          </span>
        </label>
      )}
      {area === OTHER_AREA && (
        <label className="field">{t("اسم المنطقة")}<input className="input" value={other} onChange={(e) => setOther(e.target.value)} placeholder={t("اكتبي اسم المنطقة أو البلدة")} autoFocus /></label>
      )}
    </div>
  );
}
