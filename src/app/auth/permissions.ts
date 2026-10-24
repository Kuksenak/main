import { TranslationKey } from '../core/i18n/translations';

/**
 * The app's areas (its sections) that access is given to, one by one — the same fixed list as the
 * API's (Core.Api Entities/Permissions.cs: Areas, with its two bits); a new one: a line in both, and its name in
 * AREA_LABELS.
 */
export const AREAS = ['schedule'] as const;
export type Area = (typeof AREAS)[number];

/** Each area's name, as its section's. */
export const AREA_LABELS: Record<Area, TranslationKey> = {
  schedule: 'nav.schedule',
};

/** How far one may go in an area, in order: write includes read. */
export const LEVELS = ['none', 'read', 'write'] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_LABELS: Record<Level, TranslationKey> = {
  none: 'level.none',
  read: 'level.read',
  write: 'level.write',
};

/** Whether `has` is at least `needs` (none < read < write). */
export function atLeast(has: Level | undefined, needs: Level): boolean {
  return LEVELS.indexOf(has ?? 'none') >= LEVELS.indexOf(needs);
}
