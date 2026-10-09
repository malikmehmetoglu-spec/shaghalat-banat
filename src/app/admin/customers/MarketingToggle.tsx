"use client";
import { useTransition } from "react";
import { setCustomerMarketing } from "../actions";

export function MarketingToggle({ phone, on }: { phone: string; on: boolean }) {
  const [pending, start] = useTransition();
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, lineHeight: 1.5, cursor: "pointer", opacity: pending ? .6 : 1 }}>
      <input type="checkbox" checked={on} disabled={pending} onChange={(e) => start(() => setCustomerMarketing(phone, e.target.checked))} style={{ width: 20, height: 20, accentColor: "var(--magenta)" }} />
      موافقة على قنوات ومجموعات العروض
    </label>
  );
}
