/** أيقونات خطية بسماكة 1.8 — حسب نظام التصميم */
type Name =
  | "home" | "grid" | "heart" | "bag" | "user" | "bell" | "search" | "back" | "forward"
  | "plus" | "minus" | "trash" | "pin" | "truck" | "card" | "check" | "close" | "chat"
  | "shield" | "logout" | "edit" | "sort" | "filter" | "star" | "clock" | "globe" | "return" | "tag" | "info" | "barcode" | "boxes";

const paths: Record<Name, React.ReactNode> = {
  home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  grid: (<><rect x="4" y="4" width="6.5" height="6.5" rx="2" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="2" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="2" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" /></>),
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  bag: (<><path d="M5 7h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" /><path d="M9 7a3 3 0 0 1 6 0" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>),
  bell: (<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  back: <path d="m9 6 6 6-6 6" />,
  forward: <path d="m15 6-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />,
  pin: (<><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
  truck: (<><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>),
  card: (<><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M7 15h4" /></>),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-5A8 8 0 1 1 21 12z" />,
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  sort: <path d="M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  star: <path d="M12 3l2.6 5.6L20 9.5l-4 4 1 5.8-5-2.8-5 2.8 1-5.8-4-4 5.4-.9z" />,
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>),
  return: <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />,
  tag: (<><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></>),
  barcode: <path d="M4 5v14M7 5v14M10 5v14M14 5v14M16 5v14M20 5v14" />,
  boxes: (<><path d="M3 8l9-5 9 5-9 5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></>),
};

export function Icon({ name, size = 20, stroke = 1.8, fill = "none", className }: { name: Name; size?: number; stroke?: number; fill?: string; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={[className, name === "back" || name === "forward" ? "dir-icon" : ""].filter(Boolean).join(" ") || undefined}>
      {paths[name]}
    </svg>
  );
}
