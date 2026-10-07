"use client";
export function PrintButton({ label = "طباعة", className = "btn" }: { label?: string; className?: string }) {
  return <button type="button" className={className} style={{ flex: 1 }} onClick={() => window.print()}>{label}</button>;
}
