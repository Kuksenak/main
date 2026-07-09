import { Injectable, signal } from '@angular/core';

/**
 * Apple Health bridge WITHOUT a native app and WITHOUT a backend.
 *
 * Flow:
 *   1. An Apple Shortcut ("Команды") reads Health samples (steps, heart rate, …).
 *   2. The Shortcut base64-encodes them as JSON and opens the PWA:
 *        https://<app>/?health=<base64-json>
 *   3. This service reads that query param on boot, decodes it, stores it in
 *      localStorage, and cleans the URL.
 *   4. `sync()` deep-links back to run the Shortcut (`shortcuts://run-shortcut`).
 *
 * Everything stays on-device.
 */

export interface DaySteps {
  date: string; // YYYY-MM-DD
  steps: number;
}

export interface HealthData {
  syncedAt: number;
  days?: DaySteps[];
  [key: string]: unknown;
}

// Name of the Shortcut the user installs (must match exactly).
const SHORTCUT_NAME = 'SyncHealth';
const STORAGE_KEY = 'apple-health-data';

@Injectable({ providedIn: 'root' })
export class HealthService {
  readonly data = signal<HealthData | null>(this.load());

  constructor() {
    this.ingestFromUrl();
  }

  /** Deep-link to run the pre-installed Shortcut (iOS only). */
  sync(): void {
    window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.data.set(null);
  }

  private ingestFromUrl(): void {
    const params = new URLSearchParams(window.location.search);

    let days: DaySteps[] = [];

    // Option A: full daily list  →  ?days=2026-07-09:1234,2026-07-08:5678
    const raw = params.get('days');
    // Option B (simpler Shortcut): just today's total  →  ?steps=1234
    const stepsToday = params.get('steps');

    if (raw) {
      days = raw
        .split(',')
        .map((pair) => {
          const [date, steps] = pair.split(':');
          return { date, steps: Number(steps) };
        })
        .filter((d) => d.date && !isNaN(d.steps));
    } else if (stepsToday !== null && stepsToday !== '' && !isNaN(Number(stepsToday))) {
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      days = [{ date, steps: Number(stepsToday) }];
    }

    days.sort((a, b) => a.date.localeCompare(b.date));
    if (!days.length) return;

    // Upsert by date into existing history (so syncing "just today" still builds
    // a daily chart over time), keep the most recent 30 days.
    const byDate = new Map<string, number>((this.load()?.days ?? []).map((d) => [d.date, d.steps]));
    for (const d of days) byDate.set(d.date, d.steps);
    const mergedDays = [...byDate.entries()]
      .map(([date, steps]) => ({ date, steps }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    const merged: HealthData = { days: mergedDays, syncedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    this.data.set(merged);

    // Strip the params so a refresh doesn't re-ingest.
    params.delete('days');
    params.delete('steps');
    const query = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
  }

  private load(): HealthData | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as HealthData) : null;
  }

  private decodeBase64Utf8(b64: string): string {
    // atob → binary string → proper UTF-8
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
}
