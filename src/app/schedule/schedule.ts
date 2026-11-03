import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { desktop } from '../core/device';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon, UiButton, UiFloatingButton, UiList, UiListItem, UiPrimary } from '../core/ui';
import { startOfDay, startOfMonth } from '../core/utils/date';
import { PageTitle } from '../layout/page-title';
import { Calendar } from './calendar';
import { EventEditor } from './event-editor';
import { EventsStore, Occurrence } from './events.store';

/**
 * The schedule: the month in view and Today over the calendar's days (the days with events: a dot),
 * the picked day's events by it (desktops: at its right; phones: under it) — a click opens one (the
 * event's window / sheet: EventEditor); New event (desktops: + by Today; phones: + floating at the
 * bottom right) — on the picked day. Phones: the month in the top bar, Today floating at the bottom left.
 */
@Component({
  selector: 'app-schedule',
  imports: [Calendar, EventEditor, Icon, TranslatePipe, UiButton, UiFloatingButton, UiList, UiListItem, UiPrimary],
  templateUrl: './schedule.html',
})
export class Schedule {
  private readonly i18n = inject(I18nService);
  private readonly calendar = viewChild.required(Calendar);
  protected readonly store = inject(EventsStore);
  protected readonly desktop = desktop;

  protected readonly selected = signal(startOfDay(new Date()));
  protected readonly month = signal(startOfMonth(new Date()));
  // The event open (new: none in it)
  protected readonly editing = signal<{ event: Occurrence | null } | null>(null);

  // "October 2026" / "Październik 2026" (capitalized in every language)
  protected readonly title = computed(() =>
    this.i18n.capitalize(this.i18n.date(this.month(), { month: 'long', year: 'numeric' })),
  );
  // "Monday, 3 November"
  protected readonly dayTitle = computed(() =>
    this.i18n.capitalize(this.i18n.date(this.selected(), { weekday: 'long', day: 'numeric', month: 'long' })),
  );
  protected readonly events = computed(() => this.store.ofDay(this.selected()));

  constructor() {
    // (phones: the month in the top bar)
    inject(PageTitle).show(this.title);
    // (the month in view — or the day picked: its events read)
    effect(() => this.store.show(this.month()));
    effect(() => this.store.show(this.selected()));
  }

  protected today(): void {
    const today = startOfDay(new Date());
    this.selected.set(today);
    this.calendar().show(today);
  }

  protected create(): void {
    this.editing.set({ event: null });
  }

  protected open(event: Occurrence): void {
    this.editing.set({ event });
  }

  // "09:00", "09:00–10:30"
  protected start(event: Occurrence): string {
    return this.i18n.time(event.startsAt);
  }

  protected span(event: Occurrence): string {
    const end = new Date(new Date(event.startsAt).getTime() + event.durationMinutes * 60_000);
    return `${this.i18n.time(event.startsAt)}–${this.i18n.time(end)}`;
  }

  protected past(event: Occurrence): boolean {
    return new Date(event.startsAt).getTime() + event.durationMinutes * 60_000 < Date.now();
  }
}
