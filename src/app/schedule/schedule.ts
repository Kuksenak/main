import { DatePipe, formatDate, NgTemplateOutlet } from '@angular/common';
import {
  AfterViewInit,
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  LOCALE_ID,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { DateField } from '../core/ui/date/date';
import { SelectField, SelectOption } from '../core/ui/select/select';
import { TimeField } from '../core/ui/time/time';
import { Lesson, LessonService, LessonStatus } from './lesson.service';

interface EditorModel {
  id: string | null;
  studentName: string;
  date: string; // yyyy-MM-dd (display only)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  note: string;
  status: LessonStatus;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  const p = (n: number) => `${n}`.padStart(2, '0');
  return `${p(h)}:${p(m)}`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfGrid(d: Date): Date {
  const first = startOfMonth(d);
  const day = (first.getDay() + 6) % 7; // Monday = 0
  return addDays(first, -day);
}

function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  return addDays(x, -day);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function toDateInput(d: Date): string {
  const p = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function toTimeInput(d: Date): string {
  const p = (n: number) => `${n}`.padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

@Component({
  selector: 'app-schedule',
  imports: [FormsModule, DatePipe, NgTemplateOutlet, TimeField, SelectField, DateField],
  templateUrl: './schedule.html',
})
export class Schedule implements AfterViewInit {
  private service = inject(LessonService);

  protected readonly isMobile = inject(DeviceDetectionService).isMobile;
  protected readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  private readonly cal = viewChild<ElementRef<HTMLElement>>('cal');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  // Custom scroll indicator for the events card (top/height in % of the card), null when
  // everything fits. Brighter while scrolling, like iOS.
  protected readonly listThumb = signal<{ top: number; height: number } | null>(null);
  protected readonly listScrolling = signal(false);
  private listScrollTimer?: ReturnType<typeof setTimeout>;
  protected readonly statusOptions: SelectOption[] = [
    { label: 'Scheduled', value: 'Scheduled' },
    { label: 'Done', value: 'Done' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];

  protected readonly selectedDate = signal(startOfDay(new Date()));

  // Continuous calendar: a long window of weeks the user scrolls through. The
  // title follows whichever month fills the middle of the viewport.
  private static readonly WEEKS_BEFORE = 26;
  private static readonly WEEKS_TOTAL = 53;
  private readonly weeksStart = addDays(
    startOfWeek(new Date()),
    -Schedule.WEEKS_BEFORE * 7,
  );
  protected readonly allWeeks: Date[][] = Array.from(
    { length: Schedule.WEEKS_TOTAL },
    (_, w) => Array.from({ length: 7 }, (_, d) => addDays(this.weeksStart, w * 7 + d)),
  );
  protected readonly visibleMonth = signal(startOfMonth(new Date()));

  private rowPx(): number {
    return this.isMobile() ? 44 : 48;
  }

  protected readonly editor = signal<EditorModel | null>(null);

  protected readonly sheetClosing = signal(false);
  // Editor renders as a solid centered dialog on desktop (Tailwind `sm`).
  protected readonly isDesktop = window.matchMedia('(min-width: 40rem)').matches;

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
    const locale = inject(LOCALE_ID);
    effect(() => toolbar.title.set(formatDate(this.visibleMonth(), 'MMMM yyyy', locale)));
    inject(DestroyRef).onDestroy(() => toolbar.title.set(''));

    // Load lessons for the whole scrollable window once.
    this.service.load(this.weeksStart, addDays(this.weeksStart, Schedule.WEEKS_TOTAL * 7));

    // Keep the editor sheet pinned: iOS scrolls the document to reveal a focused
    // field even with overflow hidden — snap it back so the sheet never shifts.
    window.addEventListener('scroll', () => {
      if (this.editor() && (window.scrollY || window.scrollX)) window.scrollTo(0, 0);
    });
  }

  // Recompute the indicator whenever the day's events re-render.
  private readonly listThumbSync = afterRenderEffect(() => {
    this.dayLessons();
    this.updateListThumb();
  });

  protected onListScroll(): void {
    this.updateListThumb();
    this.listScrolling.set(true);
    clearTimeout(this.listScrollTimer);
    this.listScrollTimer = setTimeout(() => this.listScrolling.set(false), 800);
  }

  private updateListThumb(): void {
    const el = this.list()?.nativeElement;
    if (!el || el.scrollHeight <= el.clientHeight + 1) {
      this.listThumb.set(null);
      return;
    }
    const height = Math.max(10, (el.clientHeight / el.scrollHeight) * 100);
    const maxScroll = el.scrollHeight - el.clientHeight;
    const top = (el.scrollTop / maxScroll) * (100 - height);
    this.listThumb.set({ top, height });
  }

  ngAfterViewInit(): void {
    // Start scrolled to the current week.
    setTimeout(() => this.scrollToToday());
  }

  private loadRange(): { from: Date; to: Date } {
    return { from: this.weeksStart, to: addDays(this.weeksStart, Schedule.WEEKS_TOTAL * 7) };
  }

  // Scroll handler: title follows the month filling the middle of the viewport.
  protected onCalScroll(el: HTMLElement): void {
    const idx = Math.floor((el.scrollTop + el.clientHeight / 2) / this.rowPx());
    const week = this.allWeeks[Math.max(0, Math.min(this.allWeeks.length - 1, idx))];
    const m = startOfMonth(week[3]); // Thursday — representative day of the week
    if (m.getTime() !== this.visibleMonth().getTime()) {
      this.visibleMonth.set(m);
    }
  }

  protected scrollToToday(): void {
    const el = this.cal()?.nativeElement;
    if (el) el.scrollTop = Schedule.WEEKS_BEFORE * this.rowPx();
    this.visibleMonth.set(startOfMonth(new Date()));
  }

  protected countFor(day: Date): number {
    return this.byDay().get(toDateInput(day))?.length ?? 0;
  }

  // Indicator width: a single dot for one event, a longer oval for several (capped at 5).
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

  // Month label for a week when it contains the 1st (inline divider in the scroll).
  protected monthStart(week: Date[]): string | null {
    const first = week.find((d) => d.getDate() === 1);
    return first ? first.toLocaleDateString(undefined, { month: 'short' }) : null;
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

  protected openNew(): void {
    const d = this.selectedDate();
    this.editor.set({
      id: null,
      studentName: '',
      date: toDateInput(d),
      startTime: '18:00',
      endTime: '19:00',
      note: '',
      status: 'Scheduled',
    });
    this.editorSnapshot = JSON.stringify(this.editor());
  }

  protected openEdit(lesson: Lesson): void {
    const start = new Date(lesson.startsAt);
    this.editor.set({
      id: lesson.id,
      studentName: lesson.studentName,
      date: toDateInput(start),
      startTime: toTimeInput(start),
      endTime: minToTime(timeToMin(toTimeInput(start)) + lesson.durationMinutes),
      note: lesson.note ?? '',
      status: lesson.status,
    });
    this.editorSnapshot = JSON.stringify(this.editor());
  }

  // Stable Date reference for the <app-date> picker (edit mode), recomputed only
  // when the editor changes so the ngModel binding doesn't loop.
  protected readonly editorDate = computed(() => {
    const m = this.editor();
    if (!m) return null;
    const [y, mo, d] = m.date.split('-').map(Number);
    return new Date(y, mo - 1, d);
  });

  protected setDate(date: Date | null): void {
    const m = this.editor();
    if (!m || !date) return;
    this.editor.set({ ...m, date: toDateInput(date) });
  }

  protected dateLabel(key: string): string {
    const [y, mo, d] = key.split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  // Changing the start keeps the previous duration and shifts the end along.
  protected onStartChange(m: EditorModel, value: string): void {
    const duration = Math.max(0, timeToMin(m.endTime) - timeToMin(m.startTime));
    m.startTime = value;
    m.endTime = minToTime(timeToMin(value) + duration);
  }

  protected onEndChange(m: EditorModel, value: string): void {
    m.endTime = value;
  }

  // Snapshot of the editor when it opened, to tell whether anything was changed.
  private editorSnapshot = '';

  protected isDirty(m: EditorModel): boolean {
    return JSON.stringify(m) !== this.editorSnapshot;
  }

  protected canSave(m: EditorModel): boolean {
    return !!m.studentName.trim() && !this.isInvalid(m);
  }

  // Color of the calendar a lesson belongs to (bar on the left of each row). One calendar
  // for now; a Google Calendar integration would give each calendar its own color.
  protected lessonColor(_lesson: Lesson): string {
    return 'var(--calendar-default)';
  }

  protected isInvalid(m: EditorModel): boolean {
    return timeToMin(m.endTime) <= timeToMin(m.startTime);
  }

  protected closeEditor(): void {
    if (this.editor() === null || this.sheetClosing()) return;
    // Slide the page out to the right, then remove it.
    this.sheetClosing.set(true);
    setTimeout(() => {
      this.editor.set(null);
      this.sheetClosing.set(false);
    }, 240);
  }

  protected save(): void {
    const m = this.editor();
    if (!m || !this.canSave(m)) return;

    const startsAt = new Date(`${m.date}T${m.startTime}`).toISOString();
    const input = {
      studentName: m.studentName.trim(),
      startsAt,
      durationMinutes: timeToMin(m.endTime) - timeToMin(m.startTime),
      note: m.note.trim() || null,
      status: m.status,
    };

    const { from, to } = this.loadRange();
    if (m.id) {
      this.service.update(m.id, input, from, to);
    } else {
      this.service.create(input, from, to);
    }
    this.closeEditor();
  }

  protected remove(): void {
    const m = this.editor();
    if (!m?.id) return;
    const { from, to } = this.loadRange();
    this.service.remove(m.id, from, to);
    this.closeEditor();
  }
}
