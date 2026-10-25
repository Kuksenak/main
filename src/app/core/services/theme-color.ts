/**
 * The status bar's color, put in again as anything over the whole screen closes. EXPERIMENT: the
 * app sets no theme-color now (iOS colors the bar by the system's theme itself) — nothing to put
 * in; kept so the overlays' call stays in one place if the tag comes back.
 */
export function refreshThemeColor(): void {
  document.dispatchEvent(new Event('theme-color'));
}
