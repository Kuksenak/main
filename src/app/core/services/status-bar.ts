// The phone's status bar (theme-color): index.html sets it to the page's color; `dim()` while a
// sheet is open — the page's color under the sheet's backdrop (black at BACKDROP) — `undim()` after.
// (index.html puts a new tag each time: iOS ignores an edited one while a popup is open.)

/** How dark a sheet's backdrop is (as `bg-backdrop`, base.css). */
export const BACKDROP = 0.3;

type BarWindow = Window & { __setBar?: (color: string | null) => void };

export function dimStatusBar(): void {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--app-bg').trim();
  (window as BarWindow).__setBar?.(darken(bg, BACKDROP));
}

export function undimStatusBar(): void {
  (window as BarWindow).__setBar?.(null);
}

// #rrggbb with black over it at `amount` (as the backdrop over the page)
function darken(hex: string, amount: number): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const channel = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount)).toString(16).padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}
