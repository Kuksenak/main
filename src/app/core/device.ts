/**
 * The device, as index.html decided it once, before the app started (`<html data-device>`): a
 * phone or a desktop. Each gets its own pieces where they differ (e.g. the layouts — app.routes).
 */
export const desktop = document.documentElement.dataset['device'] === 'desktop';

/** In a phone's browser, not the installed app (its own bars about: e.g. Safari's over the keyboard sits higher). */
export const inBrowser = !(
  matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
);
