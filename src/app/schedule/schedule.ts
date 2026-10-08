import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { NavStack } from '../core/services/nav-stack.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { addDays, startOfDay, toDateInput, toTimeInput } from '../core/utils/time';
import { GroupService } from '../students/group.service';
import { LessonTitleStore } from './lesson-title.store';
import {
  LESSON_WEEKS_TOTAL,
  Lesson,
  LessonService,
  LessonStatus,
  lessonWindow,
} from './lesson.service';

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() + 6) % 7)); // Monday = 0
}

/** Continuous calendar + the selected day's lessons. Lessons open as cards on the NavStack. */
@Component({
  selector: 'app-schedule',
  imports: [Icon, ScrollArea, TranslatePipe],
  templateUrl: './schedule.html',
})
export class Schedule implements AfterViewInit {
  private service = inject(LessonService);
  private titles = inject(LessonTitleStore);
  private groups = inject(GroupService);
  private stack = inject(NavStack);
  private i18n = inject(I18nService);

  protected readonly isMobile = inject(DeviceDetectionService).isMobile;
  protected readonly weekdays = this.i18n.weekdays;

  private readonly cal = viewChild<ElementRef<HTMLElement>>('cal');

  protected readonly selectedDate = signal(startOfDay(new Date()));

  // Continuous calendar: the lesson load window, one row per week. The title follows whichever
  // month fills the middle of the viewport.
  private readonly weeksStart = lessonWindow().from;
  protected readonly allWeeks: Date[][] = Array.from({ length: LESSON_WEEKS_TOTAL }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(this.weeksStart, w * 7 + d)),
  );
  protected readonly visibleMonth = signal(startOfMonth(new Date()));

  private rowPx(): number {
    return this.isMobile() ? 44 : 48;
  }

  // Month title, e.g. "October 2026" / "Październik 2026" (capitalized for every language).
  protected readonly monthTitle = computed(() => {
    const s = this.visibleMonth().toLocaleDateString(this.i18n.locale(), {
      month: 'long',
      year: 'numeric',
    });
    return s.charAt(0).toLocaleUpperCase(this.i18n.locale()) + s.slice(1);
  });

  // Lessons grouped by day key for O(1) cell lookup.
  private readonly byDay = computed(() => {
    const map = new Map<string, Lesson[]>();
    for (const l of this.service.lessons()) {
      const key = toDateInput(new Date(l.startsAt));
      (map.get(key) ?? map.set(key, []).get(key)!).push(l);
    }
    for (const list of map.values()) list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return map;
  });

  protected readonly dayLessons = computed(
    () => this.byDay().get(toDateInput(this.selectedDate())) ?? [],
  );

  constructor() {
    // Show the visible month in the mobile toolbar while this page is open.
    const toolbar = inject(ToolbarService);
    effect(() => toolbar.title.set(this.monthTitle()));
    inject(DestroyRef).onDestroy(() => toolbar.title.set(''));

    this.service.ensureLoaded();
  }

  ngAfterViewInit(): void {
    // Start on the current month.
    setTimeout(() => this.scrollToToday());
  }

  // Scroll handler: title follows the month filling the middle of the viewport.
  protected onCalScroll(el: HTMLElement): void {
    const idx = Math.floor((el.scrollTop + el.clientHeight / 2) / this.rowPx());
    const week = this.allWeeks[Math.max(0, Math.min(this.allWeeks.length - 1, idx))];
    const m = startOfMonth(week[3]); // Thursday — representative day of the week
    if (m.getTime() !== this.visibleMonth().getTime()) this.visibleMonth.set(m);
  }

  protected scrollToToday(): void {
    this.scrollToDay(new Date());
  }

  // Show the whole month containing `day`: its first week goes to the top (a month spans at
  // most 6 weeks, which is what the calendar shows), and that month becomes the active one.
  private scrollToDay(day: Date): void {
    const month = startOfMonth(day);
    const week = Math.round((startOfWeek(month).getTime() - this.weeksStart.getTime()) / (7 * 86_400_000));
    const el = this.cal()?.nativeElement;
    if (el) el.scrollTop = Math.max(0, Math.min(LESSON_WEEKS_TOTAL, week)) * this.rowPx();
    this.visibleMonth.set(month);
  }

  protected countFor(day: Date): number {
    return this.byDay().get(toDateInput(day))?.length ?? 0;
  }

  // Indicator under a day with events: a dot for one, a longer dash per extra event (capped at 5).
  protected dotWidth(day: Date): number {
    const n = Math.min(this.countFor(day), 5);
    return n <= 1 ? 4 : 4 + (n - 1) * 4;
  }

  // Dash color: the calendar color of the day's first event.
  protected dayColor(day: Date): string {
    const first = this.byDay().get(toDateInput(day))?.[0];
    return first ? this.lessonColor(first) : 'var(--calendar-default)';
  }

  // Dim days outside the month currently shown in the title.
  protected inMonth(day: Date): boolean {
    const vm = this.visibleMonth();
    return day.getMonth() === vm.getMonth() && day.getFullYear() === vm.getFullYear();
  }

  protected isSelected(day: Date): boolean {
    return startOfDay(day).getTime() === this.selectedDate().getTime();
  }

  protected isToday(day: Date): boolean {
    return startOfDay(day).getTime() === startOfDay(new Date()).getTime();
  }

  protected selectDay(day: Date): void {
    this.selectedDate.set(startOfDay(day));
  }

  protected today(): void {
    this.selectedDate.set(startOfDay(new Date()));
    this.scrollToToday();
  }

  protected timeLabel(iso: string): string {
    return toTimeInput(new Date(iso));
  }

  protected endLabel(iso: string, minutes: number): string {
    return toTimeInput(new Date(new Date(iso).getTime() + minutes * 60_000));
  }

  // Calendar color of a lesson (bar on the left of each row, calendar dots): the group's color
  // for group lessons, else the default calendar color. A Google Calendar integration would
  // add per-calendar colors here.
  protected lessonColor(lesson: Lesson): string {
    return this.groups.lessonColor(lesson.studentName);
  }

  protected lessonTitle(lesson: Lesson): string {
    return this.titles.get(lesson.id);
  }

  protected statusKey(status: LessonStatus): TranslationKey {
    return `lesson.status.${status}`;
  }

  protected openNew(): void {
    this.stack.push({ kind: 'lesson', id: null, date: toDateInput(this.selectedDate()) });
  }

  protected openEdit(lesson: Lesson): void {
    this.stack.push({ kind: 'lesson', id: lesson.id });
  }
}
