import { AfterViewInit, Component, ElementRef, inject, model, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { addDays, sameDay, sameMonth, startOfDay, startOfMonth, startOfWeek, WEEK_MS } from '../core/utils/date';

// The weeks it scrolls through: half a year back and forward from this one
const WEEKS_BEFORE = 26;
const WEEKS = 53;

/**
 * The schedule's calendar, as iOS Calendar's month: the weekdays' row (Monday first), then the
 * weeks one under another, scrolling on and on, six of them in view (any month fits). The days of
 * the month mostly in view are clear, the rest dimmed (`[(month)]`: that month — for the page's title);
 * today in the accent color; the picked day (`[(selected)]`) on a dark circle.
 *   <app-calendar [(selected)]="day" [(month)]="month" />  …  calendar.show(today)
 */
@Component({
  selector: 'app-calendar',
  host: { class: 'flex flex-col' },
  templateUrl: './calendar.html',
})
export class Calendar implements AfterViewInit {
  readonly selected = model(startOfDay(new Date()));
  /** The month in view (its first day): `[(month)]`, for the page's title. */
  readonly month = model(startOfMonth(new Date()));

  protected readonly weekdays = inject(I18nService).weekdays;
  private readonly first = addDays(startOfWeek(new Date()), -WEEKS_BEFORE * 7);
  protected readonly weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(this.first, w * 7 + d)),
  );
  private readonly today = startOfDay(new Date());

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');

  ngAfterViewInit(): void {
    this.show(this.selected());
  }

  /** The month of `day` in view, its first week at the top. */
  show(day: Date): void {
    const month = startOfMonth(day);
    const week = Math.round((startOfWeek(month).getTime() - this.first.getTime()) / WEEK_MS);
    this.scroller().nativeElement.scrollTop = Math.max(0, week) * this.rowHeight();
    this.month.set(month);
  }

  // Scrolled: the month is the one of the week in the middle (its Thursday: it's in the week's month)
  protected scrolled(): void {
    const el = this.scroller().nativeElement;
    const at = Math.floor((el.scrollTop + el.clientHeight / 2) / this.rowHeight());
    const week = this.weeks[Math.max(0, Math.min(WEEKS - 1, at))];
    const month = startOfMonth(week[3]);
    if (!sameMonth(month, this.month())) this.month.set(month);
  }

  private rowHeight(): number {
    return (this.scroller().nativeElement.firstElementChild as HTMLElement | null)?.offsetHeight || 40;
  }

  protected inMonth(day: Date): boolean {
    return sameMonth(day, this.month());
  }

  protected isSelected(day: Date): boolean {
    return sameDay(day, this.selected());
  }

  protected isToday(day: Date): boolean {
    return sameDay(day, this.today);
  }
}
