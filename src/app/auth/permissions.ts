import { TranslationKey } from '../core/i18n/translations';

/**
 * The app's areas (its sections) that access is given to, one by one, yes or no — the same fixed
 * list as the API's (Core.Api Entities/Permissions.cs: Areas, a bit each); a new one: a line in
 * both, and its name in AREA_LABELS.
 */
export const AREAS = ['schedule', 'library'] as const;
export type Area = (typeof AREAS)[number];

/** Each area's name, as its section's. */
export const AREA_LABELS: Record<Area, TranslationKey> = {
  schedule: 'nav.schedule',
  library: 'nav.library',
};
