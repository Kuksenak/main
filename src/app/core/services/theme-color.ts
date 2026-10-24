/**
 * The status bar's color put in again (index.html's script does it: the 'theme-color' event).
 * Anything over the whole screen (the search, a sheet) calls it as it closes: the theme changed
 * while it was open, iOS keeps the old color in the status bar till the tag is put in anew.
 */
export function refreshThemeColor(): void {
  document.dispatchEvent(new Event('theme-color'));
}
