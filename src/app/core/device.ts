/**
 * The device, as index.html decided it once, before the app started (`<html data-device>`): a
 * phone or a desktop. Each gets its own pieces where they differ (e.g. the layouts — app.routes).
 */
export const desktop = document.documentElement.dataset['device'] === 'desktop';

/** Opened from the home screen (the installed app), not in the browser. */
export const installed =
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
