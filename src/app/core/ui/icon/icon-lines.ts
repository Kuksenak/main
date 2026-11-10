// The app's icons, our own, drawn as Notion's menus are: even lines of one weight (1.5 on a 24 grid),
// round ends and joins, one color (the text's — gray in rows); no solid shapes but dots (⋯,
// the drag handle). On every device; used as a mask over the text's color (icon.ts). The brands' marks
// (Google, Apple) aren't here.
const S = 'fill="black" stroke="none" fill-rule="evenodd"';

const PATHS: Record<string, string> = {
  home: '<path d="M4 10.2 12 3.6l8 6.6V19a1.9 1.9 0 0 1-1.9 1.9H14.6v-5.4a1 1 0 0 0-1-1h-3.2a1 1 0 0 0-1 1v5.4H5.9A1.9 1.9 0 0 1 4 19z"/>',
  calendar: '<rect x="3.6" y="5" width="16.8" height="15.6" rx="2.6"/><path d="M3.6 9.8h16.8M8 3v3.6M16 3v3.6"/>',
  library: '<path d="M4.5 4v16M9 6v14M13.5 6v14"/><path d="m17.2 6.4 3.4 13.2"/>',
  clock: '<circle cx="12" cy="12" r="8.8"/><path d="M12 7.2V12l3.2 2"/>',
  trash: '<path d="M4.4 6.6h15.2M9.4 6.4V4.8a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1v1.6"/><path d="m6.2 6.8.8 12.4a1.9 1.9 0 0 0 1.9 1.8h6.2a1.9 1.9 0 0 0 1.9-1.8l.8-12.4M10.2 10.8v6M13.8 10.8v6"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4.6 20.4c.6-3.6 3.6-6 7.4-6s6.8 2.4 7.4 6"/>',
  bookmark: '<path d="M7 3.2h10a1.6 1.6 0 0 1 1.6 1.6v15.6L12 16.4l-6.6 4V4.8A1.6 1.6 0 0 1 7 3.2z"/>',
  // (a favorite's: the same, filled in)
  'bookmark-filled': `<path ${S} d="M7 3.2h10a1.6 1.6 0 0 1 1.6 1.6v15.6L12 16.4l-6.6 4V4.8A1.6 1.6 0 0 1 7 3.2z"/><path d="M7 3.2h10a1.6 1.6 0 0 1 1.6 1.6v15.6L12 16.4l-6.6 4V4.8A1.6 1.6 0 0 1 7 3.2z"/>`,
  lock: '<rect x="4.6" y="10.4" width="14.8" height="10.2" rx="2.2"/><path d="M8 10.4V7.6a4 4 0 0 1 8 0v2.8M12 14.6v2"/>',
  // (the assistant: a robot's head — a squarish face, its antenna bent to the left, ears, two eyes)
  sparkle: '<rect x="4" y="8.2" width="16" height="11.8" rx="2.2"/><path d="M12 8.2V4.2H8.4M2.2 14h1.8M20 14h1.8M9.1 12.9v2.2M14.9 12.9v2.2"/>',
  grid: '<rect x="3.6" y="3.6" width="7" height="7" rx="1.6"/><rect x="13.4" y="3.6" width="7" height="7" rx="1.6"/><rect x="3.6" y="13.4" width="7" height="7" rx="1.6"/><rect x="13.4" y="13.4" width="7" height="7" rx="1.6"/>',
  pencil: '<path d="M11.4 4.6H6.4a2.4 2.4 0 0 0-2.4 2.4v10.6a2.4 2.4 0 0 0 2.4 2.4H17a2.4 2.4 0 0 0 2.4-2.4v-5"/><path d="M17.6 3.6a1.8 1.8 0 0 1 2.6 2.6L12.6 13.8l-3.4.8.8-3.4z"/>',
  eye: '<path d="M2.8 12c1.9-3.9 5.3-6.4 9.2-6.4s7.3 2.5 9.2 6.4c-1.9 3.9-5.3 6.4-9.2 6.4S4.7 15.9 2.8 12z"/><circle cx="12" cy="12" r="3"/>',
  grip: `<circle ${S} cx="9" cy="5.5" r="1.6"/><circle ${S} cx="9" cy="12" r="1.6"/><circle ${S} cx="9" cy="18.5" r="1.6"/><circle ${S} cx="15" cy="5.5" r="1.6"/><circle ${S} cx="15" cy="12" r="1.6"/><circle ${S} cx="15" cy="18.5" r="1.6"/>`,
  dots: `<circle ${S} cx="5.5" cy="12" r="1.7"/><circle ${S} cx="12" cy="12" r="1.7"/><circle ${S} cx="18.5" cy="12" r="1.7"/>`,
  page: '<path d="M7 3h6.6l5.2 5.2V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M13.4 3.2v3.6c0 .9.6 1.5 1.5 1.5h3.7M8.6 12.6h6.8M8.6 16.2h4.6"/>',
  duplicate: '<rect x="8.4" y="8.4" width="12" height="12" rx="2.2"/><path d="M15.6 5.6V5.4a2 2 0 0 0-2-2H5.4a2 2 0 0 0-2 2v8.2a2 2 0 0 0 2 2h.2"/>',
  popout: '<path d="M13.6 4h6.4v6.4M20 4l-8.6 8.6"/><path d="M10.4 5H6.2A2.2 2.2 0 0 0 4 7.2v10.6A2.2 2.2 0 0 0 6.2 20h10.6a2.2 2.2 0 0 0 2.2-2.2v-4.2"/>',
  link: '<path d="M10.2 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.1 1.1"/><path d="M13.8 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.1-1.1"/>',
  globe: '<circle cx="12" cy="12" r="8.8"/><path d="M12 3.2c-2.4 2.4-3.6 5.4-3.6 8.8s1.2 6.4 3.6 8.8c2.4-2.4 3.6-5.4 3.6-8.8S14.4 5.6 12 3.2zM3.4 12h17.2"/>',
  update: '<path d="M19.4 13a7.6 7.6 0 1 1-2.2-6.3l1.6 1.6"/><path d="M19.2 3.6v4.8h-4.8"/>',
  sidebar: '<rect x="3.2" y="4.2" width="17.6" height="15.6" rx="2.6"/><path d="M9.4 4.4v15.2"/>',
  logout: '<path d="M10 4.2H6.6A2.4 2.4 0 0 0 4.2 6.6v10.8a2.4 2.4 0 0 0 2.4 2.4H10"/><path d="m15.6 8 4 4-4 4M19.4 12H9.6"/>',
  'logout-all': '<path d="M11.4 4.2H8.6a2.4 2.4 0 0 0-2.4 2.4v10.8a2.4 2.4 0 0 0 2.4 2.4h2.8M2.8 7v10"/><path d="m15.6 8 4 4-4 4M19.4 12h-8"/>',
  search: '<circle cx="10.6" cy="10.6" r="6.6"/><path d="m15.6 15.6 4.6 4.6"/>',
  filter: '<path d="M4 7h16M7 12h10M10 17h4"/>',
  hash: '<path d="M3.8 5.6a1.8 1.8 0 0 1 1.8-1.8h5.2c.5 0 .9.2 1.3.5l7.6 7.6a1.8 1.8 0 0 1 0 2.6l-5.2 5.2a1.8 1.8 0 0 1-2.6 0l-7.6-7.6a1.8 1.8 0 0 1-.5-1.3z"/><circle cx="8.4" cy="8.4" r="1.3"/>',
  // (the tag's shape solid, its hole cut: the fill under a chosen tag's lines — icon.ts `tag`)
  'hash-fill': `<path ${S} d="M3.8 5.6a1.8 1.8 0 0 1 1.8-1.8h5.2c.5 0 .9.2 1.3.5l7.6 7.6a1.8 1.8 0 0 1 0 2.6l-5.2 5.2a1.8 1.8 0 0 1-2.6 0l-7.6-7.6a1.8 1.8 0 0 1-.5-1.3zm4.6 1.5a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z"/>`,
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  enter: '<path d="M19.4 4.6v6.2a3.6 3.6 0 0 1-3.6 3.6H5"/><path d="m8.8 10.6-3.8 3.8 3.8 3.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M17.5 6.5l-11 11M6.5 6.5l11 11"/>',
  check: '<path d="m5 12.6 4.4 4.4L19 7.4"/>',
  'chevron-left': '<path d="m14.6 6-6 6 6 6"/>',
  'chevron-right': '<path d="m9.4 6 6 6-6 6"/>',
  'chevron-down': '<path d="m6 9.4 6 6 6-6"/>',
  'chevrons-up-down': '<path d="m7.6 9 4.4-4.4L16.4 9M7.6 15l4.4 4.4 4.4-4.4"/>',
  'arrow-up-right': '<path d="M7.4 16.6 16.6 7.4M8.4 7.2h8.4v8.4"/>',
  'arrow-up': '<path d="M12 19.4V4.8M6.4 10.2 12 4.6l5.6 5.6"/>',
  'arrow-down': '<path d="M12 4.6v14.6M6.4 13.8l5.6 5.6 5.6-5.6"/>',
};

/** The icons, as CSS mask urls (none: that name keeps its drawn one). */
export const ICON_LINES: Record<string, string> = Object.fromEntries(
  Object.entries(PATHS).map(([name, paths]) => [
    name,
    `url("data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'>${paths.replace(/"/g, "'")}</svg>`,
    )}")`,
  ]),
);
