/**
 * The device, as index.html decided it once, before the app started (`<html data-device>`): a
 * phone or a desktop. Each gets its own pieces where they differ (e.g. the layouts — app.routes).
 */
export const desktop = document.documentElement.dataset['device'] === 'desktop';
