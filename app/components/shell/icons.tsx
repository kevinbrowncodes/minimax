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

/* STORY_019: the user menu, the Settings modal and the Appearance cards. */
export const IconSwitchBack = () => (
  <svg {...base}><path d="M6 4 3 7l3 3" /><path d="M3 7h6.5a3.5 3.5 0 0 1 0 7H6" /></svg>
);
export const IconSettings = () => (
  <svg {...base}><circle cx="8" cy="8" r="2.2" /><path d="M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M3.6 12.4l1.2-1.2M11.2 4.8l1.2-1.2" /></svg>
);
export const IconGift = () => (
  <svg {...base}><rect x="2" y="6" width="12" height="8" rx="1" /><path d="M2 9h12M8 6v8M5 6a1.6 1.6 0 1 1 3-1M11 6a1.6 1.6 0 1 0-3-1" /></svg>
);
export const IconChart = () => (
  <svg {...base}><path d="M2.5 13.5h11M4 11V7M8 11V4M12 11V8.5" /></svg>
);
export const IconHeadset = () => (
  <svg {...base}><path d="M3 9.5V8a5 5 0 0 1 10 0v1.5" /><rect x="2.5" y="9" width="2.5" height="4" rx="1" /><rect x="11" y="9" width="2.5" height="4" rx="1" /></svg>
);
export const IconBook = () => (
  <svg {...base}><path d="M3 2.5h6.5a2 2 0 0 1 2 2V13.5H5a2 2 0 0 0-2 2z" /><path d="M3 12.5A2 2 0 0 1 5 11h6.5" /></svg>
);
export const IconLogout = () => (
  <svg {...base}><path d="M6.5 2.5H4a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 4 13.5h2.5M10 5l3 3-3 3M13 8H6.5" /></svg>
);
export const IconChevronRight = () => (
  <svg {...base}><path d="m6 4 4 4-4 4" /></svg>
);
export const IconClose = () => (
  <svg {...base}><path d="m4 4 8 8M12 4l-8 8" /></svg>
);
export const IconGeneral = () => (
  <svg {...base}><circle cx="8" cy="8" r="6.3" /><circle cx="8" cy="8" r="2" /></svg>
);
export const IconAccount = () => (
  <svg {...base}><circle cx="8" cy="8" r="6.3" /><circle cx="8" cy="6.5" r="2" /><path d="M4.5 12.5a3.5 3.5 0 0 1 7 0" /></svg>
);
export const IconUsage = () => (
  <svg {...base}><circle cx="8" cy="8" r="6.3" /><path d="M8 4.5v3.5l2.5 1.5" /><circle cx="8" cy="8" r="2.5" /></svg>
);
export const IconArchive = () => (
  <svg {...base}><rect x="2" y="3" width="12" height="3" rx="0.8" /><path d="M3 6v6.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6M6.5 9h3" /></svg>
);
export const IconSun = () => (
  <svg {...base}><circle cx="8" cy="8" r="2.8" /><path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1" /></svg>
);
export const IconMoon = () => (
  <svg {...base}><path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" /></svg>
);
export const IconMonitor = () => (
  <svg {...base}><rect x="2" y="3" width="12" height="8" rx="1.2" /><path d="M6 13.5h4M8 11v2.5" /></svg>
);

/* STORY_021: the shell's remaining glyphs. */
export const IconChevronDown = () => (
  <svg {...base}><path d="m4 6 4 4 4-4" /></svg>
);
export const IconPin = () => (
  <svg {...base}><path d="M9.5 2.5 13.5 6.5 11 7.5 8.5 10 8 13.5 2.5 8 6 7.5 8.5 5z" /><path d="M2.5 13.5 6 10" /></svg>
);
export const IconMore = () => (
  <svg {...base}><circle cx="3.5" cy="8" r="1.1" fill="currentColor" stroke="none" /><circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" /><circle cx="12.5" cy="8" r="1.1" fill="currentColor" stroke="none" /></svg>
);
export const IconRename = () => (
  <svg {...base}><path d="m3 13 .8-3.2L10.5 3.1a1.4 1.4 0 0 1 2 0l.4.4a1.4 1.4 0 0 1 0 2L6.2 12.2z" /></svg>
);
export const IconCopy = () => (
  <svg {...base}><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" /></svg>
);
export const IconMove = () => (
  <svg {...base}><path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5H12.5A1.5 1.5 0 0 1 14 6v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12z" /><path d="M6.5 9.5h4M8.5 7.5l2 2-2 2" /></svg>
);
export const IconTrash = () => (
  <svg {...base}><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8.5" /></svg>
);
export const IconBell = () => (
  <svg {...base}><path d="M4 11V7.5a4 4 0 0 1 8 0V11l1 1.5H3z" /><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" /></svg>
);
export const IconExpand = () => (
  <svg {...base}><rect x="2" y="2.5" width="12" height="11" rx="2" /><path d="M6 2.5v11" /></svg>
);
export const IconInfo = () => (
  <svg {...base}><circle cx="8" cy="8" r="6.3" /><path d="M8 7.2v4M8 5v.2" /></svg>
);
export const IconExternal = () => (
  <svg {...base}><path d="M6 3.5H4A1.5 1.5 0 0 0 2.5 5v7A1.5 1.5 0 0 0 4 13.5h7a1.5 1.5 0 0 0 1.5-1.5v-2M9 2.5h4.5V7M13.5 2.5 7.5 8.5" /></svg>
);
export const IconPencil = () => (
  <svg {...base}><path d="m2.5 13.5.7-2.8 8-8a1.2 1.2 0 0 1 1.7 0l.4.4a1.2 1.2 0 0 1 0 1.7l-8 8z" /></svg>
);
/* STORY_024 — the Assets page's glyphs: a camera on the tile, a filter in the 390 bar, the ⋯ menu's four entries */
export const IconVideo = () => (
  <svg {...base}><rect x="2" y="4" width="8.5" height="8" rx="1.5" /><path d="m10.5 7 3.5-2v6l-3.5-2" /></svg>
);
export const IconFilter = () => (
  <svg {...base}><path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3" /><circle cx="6" cy="4.5" r="1.3" fill="var(--bg_default_primary_elevated)" /><circle cx="10" cy="8" r="1.3" fill="var(--bg_default_primary_elevated)" /><circle cx="8" cy="11.5" r="1.3" fill="var(--bg_default_primary_elevated)" /></svg>
);
export const IconLocate = () => (
  <svg {...base}><path d="M9 2.5h3.5a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9" /><path d="M2.5 8h7M7 5.5 9.5 8 7 10.5" /></svg>
);
export const IconArrowUpRight = () => (
  <svg {...base}><path d="M4 12 12 4M5.5 4H12v6.5" /></svg>
);
export const IconStar = () => (
  <svg {...base}><path d="m8 2.2 1.8 3.8 4.1.5-3 2.9.8 4.1L8 11.5l-3.7 2 .8-4.1-3-2.9 4.1-.5z" /></svg>
);
export const IconPlay = () => (
  <svg {...base}><circle cx="8" cy="8" r="6.3" /><path d="m6.5 5.5 4 2.5-4 2.5z" fill="currentColor" stroke="none" /></svg>
);
