import type { SVGProps } from "react";

/** 16 px line icons drawn by us (never lifted from the reference bundle); shapes approximate the captured glyphs. */
const base: SVGProps<SVGSVGElement> = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

export const IconPlusCircle = () => (
  <svg {...base}><circle cx="8" cy="8" r="6.3" /><path d="M8 5.2v5.6M5.2 8h5.6" /></svg>
);
export const IconSearch = () => (
  <svg {...base}><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
);
export const IconPlugins = () => (
  <svg {...base}><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><path d="M11.5 9v5M9 11.5h5" /></svg>
);
export const IconClock = () => (
  <svg {...base}><circle cx="8" cy="8" r="6.3" /><path d="M8 4.5V8l2.3 1.5" /></svg>
);
export const IconFolder = () => (
  <svg {...base}><path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5H12.5A1.5 1.5 0 0 1 14 6v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12z" /></svg>
);
export const IconPhone = () => (
  <svg {...base}><rect x="4.5" y="1.8" width="7" height="12.4" rx="1.5" /><path d="M7 12h2" /></svg>
);
export const IconProject = () => (
  <svg {...base}><rect x="2" y="4" width="12" height="9.5" rx="1.5" /><path d="M2 7h12M6 4V2.5h4V4" /></svg>
);
export const IconCollapse = () => (
  <svg {...base}><rect x="2" y="2.5" width="12" height="11" rx="2" /><path d="M6 2.5v11" /></svg>
);
export const IconDocument = () => (
  <svg {...base}><path d="M4 2h5.5L13 5.5V14H4z" /><path d="M9.5 2v3.5H13M6.5 8.5h3M6.5 11h3" /></svg>
);
export const IconDownload = () => (
  <svg {...base}><path d="M8 2.5v8M4.8 7.3 8 10.5l3.2-3.2M3 13.5h10" /></svg>
);
export const IconWorkArea = () => (
  <svg {...base}><rect x="2" y="2.5" width="12" height="11" rx="2" /><path d="M10 2.5v11" /></svg>
);
export const IconMenu = () => (
  <svg {...base}><path d="M2.5 4h11M2.5 8h11M2.5 12h11" /></svg>
);
export const IconLogo = () => (
  <svg width="18" height="16" viewBox="0 0 18 16" fill="currentColor" aria-hidden="true"><path d="M1 3h3v10H1zM6 1h3v14H6zM11 4h3v8h-3zM15 2h2v12h-2z" /></svg>
);
export const IconAvatar = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="#0094fc" /><rect x="5" y="7" width="14" height="10" rx="3" fill="#fff" /><circle cx="9.5" cy="12" r="1.5" fill="#0094fc" /><circle cx="14.5" cy="12" r="1.5" fill="#0094fc" /></svg>
);
