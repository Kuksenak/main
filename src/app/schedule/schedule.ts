import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiButton, UiFloatingButton } from '../core/ui';
import { startOfDay, startOfMonth } from '../core/utils/date';
import { PageTitle } from '../layout/page-title';
import { Calendar } from './calendar';

/**
 * The schedule: the month in view and Today over the calendar's days (so far just the days).
 * Phones: the month in the top bar, the days edge to edge, Today floating at the bottom left.
 */
@Component({
  selector: 'app-schedule',
  imports: [Calendar, TranslatePipe, UiButton, UiFloatingButton],
  templateUrl: './schedule.html',
})
export class Schedule {
  private readonly i18n = inject(I18nService);
  private readonly calendar = viewChild.required(Calendar);

  protected readonly selected = signal(startOfDay(new Date()));
  protected readonly month = signal(startOfMonth(new Date()));

  // "October 2026" / "Październik 2026" (capitalized in every language)
  protected readonly title = computed(() =>
    this.i18n.capitalize(this.i18n.date(this.month(), { month: 'long', year: 'numeric' })),
  );

  constructor() {
    // (phones: the month in the top bar)
    inject(PageTitle).show(this.title);
  }

  protected today(): void {
    const today = startOfDay(new Date());
    this.selected.set(today);
    this.calendar().show(today);
  }
}
