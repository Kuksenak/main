import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, of } from 'rxjs';
import { environment } from '@environments/environment';
import { TranslationKey } from '../core/i18n/translations';
import { LoadingService } from '../core/services/loading.service';

export type EventStatus = 'Scheduled' | 'Done' | 'Cancelled';
export const EVENT_STATUSES: EventStatus[] = ['Scheduled', 'Done', 'Cancelled'];

// Events are loaded for a window around today: 26 weeks back, 53 weeks in total, starting
// on a Monday. The schedule's scrollable calendar covers exactly this window.
const WEEKS_BEFORE = 26;
export const EVENT_WEEKS_TOTAL = 53;

export function eventWindow(): { from: Date; to: Date } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - ((from.getDay() + 6) % 7) - WEEKS_BEFORE * 7);
  const to = new Date(from);
  to.setDate(to.getDate() + EVENT_WEEKS_TOTAL * 7);
  return { from, to };
}

/** A scheduled event (class, meeting, …) and who is invited. */
export interface ScheduleEvent {
  id: string;
  title: string | null;
  studentIds: string[]; // invited students …
  groupIds: string[]; // … and groups (each invites its members)
  lessonIds: string[]; // attached lessons (materials), in order
  startsAt: string;
  durationMinutes: number;
  status: EventStatus;
  note: string | null;
}

export type EventInput = Omit<ScheduleEvent, 'id'>;

/** When an event ends. */
export function eventEnd(e: ScheduleEvent): Date {
  return new Date(new Date(e.startsAt).getTime() + e.durationMinutes * 60_000);
}

/** Translation key of an event status. */
export function statusKey(status: EventStatus): TranslationKey {
  return `event.status.${status}`;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private http = inject(HttpClient);
  private loadingService = inject(LoadingService);
  private base = `${environment.apiUrl}/events`;

  private _events = signal<ScheduleEvent[]>([]);
  readonly events = this._events.asReadonly();
  private loaded = false;

  /** Load the event window unless something already did. */
  ensureLoaded(): void {
    if (!this.loaded) this.reload();
  }

  create(input: EventInput): void {
    this.http
      .post(this.base, input)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.reload());
  }

  update(id: string, input: EventInput): void {
    this.http
      .put(`${this.base}/${id}`, input)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.reload());
  }

  remove(id: string): void {
    this.http
      .delete(`${this.base}/${id}`)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.reload());
  }

  /** (Re)load the event window — also after a student / group is deleted (uninvited). */
  reload(): void {
    this.loaded = true;
    this.loadingService.begin();
    const { from, to } = eventWindow();
    const params = { from: from.toISOString(), to: to.toISOString() };
    this.http
      .get<{ events: ScheduleEvent[] }>(this.base, { params })
      .pipe(
        catchError(() => of({ events: [] })),
        finalize(() => this.loadingService.end()),
      )
      .subscribe((res) => this._events.set(res.events ?? []));
  }
}
