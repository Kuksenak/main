import { Injectable, effect, signal } from '@angular/core';

const STORAGE_KEY = 'preferences';

/** How long a new event lasts by default, in minutes (the choices in Settings). */
export const EVENT_LENGTHS = [30, 45, 60, 90, 120] as const;

interface Stored {
  eventMinutes?: number;
  dayStart?: string; // HH:mm
}

/**
 * Settings kept in this browser (not synced between devices yet): a new event's length and the
 * hour new events on other days start at.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  readonly eventMinutes = signal(60);
  readonly dayStart = signal('09:00');

  constructor() {
    try {
      const stored: Stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      if (EVENT_LENGTHS.includes(stored.eventMinutes as (typeof EVENT_LENGTHS)[number])) this.eventMinutes.set(stored.eventMinutes!);
      if (/^\d{2}:\d{2}$/.test(stored.dayStart ?? '')) this.dayStart.set(stored.dayStart!);
    } catch {
      // storage off or broken: the defaults
    }
    effect(() => {
      const value: Stored = { eventMinutes: this.eventMinutes(), dayStart: this.dayStart() };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        // storage off: kept for this visit only
      }
    });
  }
}
