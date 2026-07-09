import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';

/**
 * Apple Health via backend (Core API) + an Apple Shortcut.
 *   • Shortcut POSTs steps/runs to `POST /api/health-sync` using the user's sync token.
 *   • This service reads `GET /api/health-sync` (cookie-auth) and shows the token
 *     (`GET /api/health-sync/token`) for the user to paste into the Shortcut.
 * Works silently in the background and with the installed PWA (no URL round-trip).
 */

export interface DaySteps {
  date: string;
  steps: number;
}

export interface Workout {
  date: string;
  distanceKm: number;
  durationMin: number;
  calories: number;
  avgHr?: number;
}

export interface HealthData {
  days?: DaySteps[];
  workouts?: Workout[];
}

const SHORTCUT_NAME = 'SyncHealth';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/health-sync`;

  readonly data = signal<HealthData | null>(null);
  readonly token = signal<string | null>(null);
  // Kept for App boot compatibility (no URL round-trip anymore).
  readonly ingested = signal(false);

  constructor() {
    this.refresh();
    this.loadToken();
  }

  refresh(): void {
    this.http.get<HealthData>(this.base).subscribe({
      next: (d) => this.data.set(d ?? null),
      error: () => {},
    });
  }

  /**
   * Run the Shortcut, then pull the fresh data.
   * The token is passed as the Shortcut's *input* (`Shortcut Input`), so the
   * user never pastes it — the Shortcut reads it straight from the deep link.
   */
  sync(): void {
    const name = encodeURIComponent(SHORTCUT_NAME);
    const token = this.token();
    const url = token
      ? `shortcuts://run-shortcut?name=${name}&input=text&text=${encodeURIComponent(token)}`
      : `shortcuts://run-shortcut?name=${name}`;
    window.location.href = url;
    setTimeout(() => this.refresh(), 2000);
    setTimeout(() => this.refresh(), 5000);
  }

  private loadToken(): void {
    this.http.get<{ token: string }>(`${this.base}/token`).subscribe({
      next: (r) => this.token.set(r.token),
      error: () => {},
    });
  }
}
