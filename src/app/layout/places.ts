import { TranslationKey } from '../core/i18n/translations';
import { IconName } from '../core/ui';

/** A section of the app: its address, name and icon — in the sidebar (desktop) and the sections' sheet (phones). */
export interface Place {
  path: string;
  label: TranslationKey;
  icon: IconName;
}

/** The app's sections, in this order. */
export const PLACES: Place[] = [
  { path: '/', label: 'nav.home', icon: 'home' },
  { path: '/schedule', label: 'nav.schedule', icon: 'calendar' },
];
