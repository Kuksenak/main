import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { environment } from '@environments/environment';
import { Toasts } from '../core/ui';
import { addDays, sameDay, startOfMonth } from '../core/utils/date';

export type Repeat = 'Never' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

/** An event as the schedule shows it: one start of it (a repeat: its own), how long, how it repeats, its pages. */
export interface Occurrence {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  repeat: Repeat;
  repeatInterval: number;
  repeatUntil: string | null;
  seriesStartsAt: string;
  pageIds: string[];
}

/** What making / changing an event sends. */
export interface EventInput {
  title: string;
  startsAt: string;
  durationMinutes: number;
  repeat: Repeat;
  repeatInterval: number;
  repeatUntil: string | null;
  pageIds: string[];
}

/** Which of a series a change / deletion is for: just this repeat, it and the later ones, all of it. */
export type Scope = 'this' | 'following' | 'all';

/**
 * The schedule's events (the API's /events) for the months around the one in view (`show(month)`:
 * read again only when it's out of them): `ofDay(day)`, the days with any (`marked`). `save` (new, or
 * changed — a repeat: for this one, the following or all), `remove` (the same): then read again.
 */
@Injectable({ providedIn: 'root' })
export class EventsStore {
  private readonly http = inject(HttpClient);
  private readonly toasts = inject(Toasts);
  private readonly url = `${environment.apiUrl}/events`;

  readonly events = signal<Occurrence[]>([]);
  // The window read: a month back, two on (its first and last day)
  private from: Date | null = null;
  private to: Date | null = null;

  /** The next ones (from now on, the soonest first): the sidebar's, under Schedule. */
  readonly upcoming = computed(() => {
    const now = Date.now();
    return this.events()
      .filter((e) => new Date(e.startsAt).getTime() + e.durationMinutes * 60_000 > now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  });

  /** An event to open (none in it: a new one) — asked from elsewhere (the sidebar); the schedule opens it. */
  readonly ask = signal<{ event: Occurrence | null } | null>(null);

  /** The days with events ("2026-11-03"). */
  readonly marked = computed(() => new Set(this.events().map((e) => dayKey(new Date(e.startsAt)))));

  /** The month in view: the events around it read (if they aren't yet). */
  show(month: Date): void {
    const m = startOfMonth(month);
    if (this.from && this.to && m >= this.from && addMonths(m, 1) <= this.to) return;
    this.read(addMonths(m, -1), addMonths(m, 2));
  }

  ofDay(day: Date): Occurrence[] {
    return this.events().filter((e) => sameDay(new Date(e.startsAt), day));
  }

  private read(from = this.from, to = this.to): void {
    if (!from || !to) return;
    this.from = from;
    this.to = to;
    this.http.get<Occurrence[]>(this.url, { params: { from: from.toISOString(), to: to.toISOString() } }).subscribe({
      next: (events) => this.events.set(events),
      error: () => this.toasts.fail('schedule.loadError'),
    });
  }

  /**
   * A new one, or one changed (a repeat: `scope` — this one, it and the later ones, all of the
   * series) — the id of the event it ended up in (new; this one / the later ones: a new one of their own).
   */
  save(input: EventInput, editing: Occurrence | null, scope: Scope): Observable<string> {
    const call: Observable<string> = !editing
      ? this.http.post<{ id: string }>(this.url, input).pipe(map((e) => e.id))
      : editing.repeat === 'Never' || scope === 'all'
        ? this.http.put(`${this.url}/${editing.id}`, scope === 'all' ? this.asSeries(input, editing) : input).pipe(map(() => editing.id))
        : this.http
            .post<{ id: string | null }>(`${this.url}/${editing.id}/occurrence`, {
              at: editing.startsAt,
              change: scope === 'this' ? { ...input, repeat: 'Never', repeatInterval: 1, repeatUntil: null } : input,
              following: scope === 'following',
            })
            .pipe(map((r) => r.id ?? editing.id));
    return call.pipe(tap({ next: () => this.read(), error: () => this.toasts.fail('schedule.saveError') }));
  }

  /** An event changed as a whole, as it is (its id: its first start, its rule — e.g. one just made). */
  put(id: string, input: EventInput): Observable<string> {
    return this.http.put(`${this.url}/${id}`, input).pipe(
      map(() => id),
      tap({ next: () => this.read(), error: () => this.toasts.fail('schedule.saveError') }),
    );
  }

  /** Deleted (a repeat: `scope` — this one, it and the later ones, all of the series). */
  remove(editing: Occurrence, scope: Scope): Observable<unknown> {
    const call: Observable<unknown> =
      editing.repeat === 'Never' || scope === 'all'
        ? this.http.delete(`${this.url}/${editing.id}`)
        : this.http.post(`${this.url}/${editing.id}/occurrence`, { at: editing.startsAt, change: null, following: scope === 'following' });
    return call.pipe(tap({ next: () => this.read(), error: () => this.toasts.fail('schedule.saveError') }));
  }

  // (all of a series changed from one of its repeats: the series keeps its first day, at the time picked)
  private asSeries(input: EventInput, editing: Occurrence): EventInput {
    const first = new Date(editing.seriesStartsAt);
    const at = new Date(input.startsAt);
    first.setHours(at.getHours(), at.getMinutes(), 0, 0);
    return { ...input, startsAt: first.toISOString() };
  }
}

/** A day as a key: "2026-11-03" (local). */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
