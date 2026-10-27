import { Area } from '../auth/permissions';
import { TranslationKey } from '../core/i18n/translations';
import { desktop } from '../core/device';
import { IconName } from '../core/ui';

/**
 * A section of the app: its address, name and icon — in the sidebar (desktop) and the top bar's
 * title menu (phones); `area`: shown only to those who can read it (its route guarded too: areaGuard).
 */
export interface Place {
  path: string;
  label: TranslationKey;
  icon: IconName;
  area?: Area;
  /** Shown when any of these may be read (e.g. Favorites: the library's pages — people later). */
  anyOf?: Area[];
  /** Phones only (desktops show it otherwise — Favorites: the sidebar's folding group). */
  phone?: boolean;
}

/** The app's sections, in this order. */
export const PLACES: Place[] = [
  { path: '/', label: 'nav.home', icon: 'home' },
  { path: '/schedule', label: 'nav.schedule', icon: 'calendar', area: 'schedule' },
  { path: '/library', label: 'nav.library', icon: 'library', area: 'library' },
  { path: '/favorites', label: 'nav.favorites', icon: 'bookmark', anyOf: ['library'], phone: true },
];

/** The sections this user may see. */
export function visiblePlaces(can: (area: Area) => boolean): Place[] {
  return PLACES.filter((p) => (!p.area || can(p.area)) && (!p.anyOf || p.anyOf.some(can)) && (!p.phone || !desktop));
}
