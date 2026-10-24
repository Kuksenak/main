import { Component, computed, inject, model, signal } from '@angular/core';
import { desktop } from '../../device';
import { I18nService } from '../../i18n/i18n.service';
import { Icon } from '../icon/icon';

// 'YYYY-MM-DD' ↔ a day (at local midnight)
function parse(value: string | null): Date | null {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function format(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/**
 * A day, as the old app's: a chip with it ("Sat, Oct 25"). Phones: the system's own picker (a tap
 * opens iOS's calendar); desktops: a calendar under the chip — the month at the left, ‹ › at the
 * right, Monday first; the chosen day a dark circle, today in the accent color. `[(value)]`:
 * 'YYYY-MM-DD' (null: none).
 */
@Component({
  selector: 'ui-date',
  imports: [Icon],
  host: { class: 'relative inline-flex' },
  templateUrl: './date.html',
})
export class UiDate {
  readonly value = model<string | null>(null);

  protected readonly i18n = inject(I18nService);
  protected readonly desktop = desktop;
  protected readonly open = signal(false);

  protected readonly day = computed(() => parse(this.value()));
  protected readonly label = computed(() => {
    const d = this.day();
    return d ? this.i18n.date(d, { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
  });

  // The month shown in the calendar (its 1st)
  protected readonly month = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  protected readonly monthLabel = computed(() => this.i18n.capitalize(this.i18n.date(this.month(), { month: 'long', year: 'numeric' })));
  // Its weeks, Monday first, the days around it filling them
  protected readonly weeks = computed(() => {
    const first = this.month();
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    const weeks: { date: Date; inMonth: boolean }[][] = [];
    for (let w = 0; w < 6; w++) {
      const week: { date: Date; inMonth: boolean }[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + i);
        week.push({ date, inMonth: date.getMonth() === first.getMonth() });
      }
      if (w > 3 && !week.some((c) => c.inMonth)) break;
      weeks.push(week);
    }
    return weeks;
  });

  protected toggle(): void {
    const d = this.day() ?? new Date();
    this.month.set(new Date(d.getFullYear(), d.getMonth(), 1));
    this.open.set(!this.open());
  }

  protected step(by: number): void {
    const m = this.month();
    this.month.set(new Date(m.getFullYear(), m.getMonth() + by, 1));
  }

  protected pick(date: Date): void {
    this.value.set(format(date));
    this.open.set(false);
  }

  protected isChosen(date: Date): boolean {
    const d = this.day();
    return !!d && sameDay(d, date);
  }

  protected isToday(date: Date): boolean {
    return sameDay(date, new Date());
  }

  protected typed(value: string): void {
    this.value.set(value || null);
  }
}
