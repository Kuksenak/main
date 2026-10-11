import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { environment } from '@environments/environment';
import { ScheduleEvent, eventWindow } from './event.service';

/** An event from the account's Google calendars, as the API sends it. */
interface GoogleEventDto {
  id: string;
  calendarId: string;
  calendarName: string;
  title: string;
  startDate: string; // UTC; an all-day event: that day's UTC midnight
  endDate: string;
  isAllDay: boolean;
  description: string | null;
  location: string | null;
}

// An all-day event's day as a local date (its UTC midnight would be the evening before
// west of Greenwich).
function localDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Shown like our own events, read-only (`source: 'google'`): no one invited, nothing attached.
function fromGoogle(e: GoogleEventDto): ScheduleEvent {
  const start = e.isAllDay ? localDay(e.startDate) : new Date(e.startDate);
  const end = e.isAllDay ? localDay(e.endDate) : new Date(e.endDate);
  const startsAt = start.toISOString();
  return {
    id: e.id,
    title: e.title,
    studentIds: [],
    groupIds: [],
    lessonIds: [],
    startsAt,
    durationMinutes: Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000)),
    repeat: 'Never',
    repeatInterval: 1,
    repeatUntil: null,
    seriesStartsAt: startsAt,
    source: 'google',
    calendarName: e.calendarName,
    allDay: e.isAllDay,
    location: e.location,
    description: e.description,
  };
}

// Fresh events: on coming back to the app when they're older than this, and this often while
// it's open.
const STALE_MS = 5 * 60_000;
const EVERY_MS = 10 * 60_000;

/**
 * Google Calendar: whether the account is connected, and (when it is) the events of its Google
 * calendars over the schedule's window — refreshed on coming back to the app (if older than 5
 * minutes) and every 10 minutes while it's open. Connecting leaves the app for Google's consent
 * screen; the API brings it back with ?calendar=connected (or error / disabled).
 */
@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // null: not known yet
  private readonly _connected = signal<boolean | null>(null);
  readonly connected = this._connected.asReadonly();
  private readonly _events = signal<ScheduleEvent[]>([]);
  readonly events = this._events.asReadonly();
  private loaded = false;
  private loadedAt = 0; // when the events last came

  /** Load the status (and the events) unless something already did; then keep them fresh. */
  ensureLoaded(): void {
    if (this.loaded) return;
    this.reload();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.refreshIfStale(STALE_MS);
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') this.refreshIfStale(EVERY_MS);
    }, EVERY_MS);
  }

  // Just the events again (when connected and they're older than `age`).
  private refreshIfStale(age: number): void {
    if (this._connected() && Date.now() - this.loadedAt >= age) this.loadEvents();
  }

  reload(): void {
    this.loaded = true;
    this.http
      .get<{ connected: boolean }>(`${this.base}/calendars/status`)
      .pipe(catchError(() => of({ connected: false })))
      .subscribe((res) => {
        this._connected.set(res.connected);
        if (res.connected) this.loadEvents();
        else this._events.set([]);
      });
  }

  /** Off to Google's consent screen (the API returns to the app afterwards). */
  connect(): void {
    window.location.href = `${this.base}/calendars/connect`;
  }

  disconnect(): void {
    this._connected.set(false);
    this._events.set([]);
    this.http
      .post(`${this.base}/calendars/disconnect`, {})
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.reload());
  }

  private loadEvents(): void {
    const { from, to } = eventWindow();
    const params = { startDate: from.toISOString(), endDate: to.toISOString() };
    this.http
      .get<{ events: GoogleEventDto[] }>(`${this.base}/calendar/events`, { params })
      // A failed load keeps what's shown
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (!res) return;
        this._events.set((res.events ?? []).map(fromGoogle));
        this.loadedAt = Date.now();
      });
  }
}
