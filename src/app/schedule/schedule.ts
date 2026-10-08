import {
  AfterViewInit,
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { DateField } from '../core/ui/date/date';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { SelectField, SelectOption } from '../core/ui/select/select';
import { TimeField } from '../core/ui/time/time';
import { StudentService } from '../students/student.service';
import { LessonTitleStore } from './lesson-title.store';
import { Lesson, LessonService, LessonStatus } from './lesson.service';

interface EditorModel {
  id: string | null;
  title: string; // stored on this device (LessonTitleStore)
  studentName: string; // picked from the students list
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
  imports: [FormsModule, TimeField, SelectField, DateField, Icon, PageSheet, TranslatePipe],
  templateUrl: './schedule.html',
})
export class Schedule implements AfterViewInit {
  private service = inject(LessonService);
  private titles = inject(LessonTitleStore);
  private students = inject(StudentService);
  private router = inject(Router);
  private i18n = inject(I18nService);

  protected readonly isMobile = inject(DeviceDetectionService).isMobile;
  protected readonly weekdays = this.i18n.weekdays;

  private readonly cal = viewChild<ElementRef<HTMLElement>>('cal');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private readonly page = viewChild(PageSheet);

  // Custom scroll indicator for the events list (top/height in % of the list), null when
  // everything fits. Brighter while scrolling.
  protected readonly listThumb = signal<{ top: number; height: number } | null>(null);
  protected readonly listScrolling = signal(false);
  private listScrollTimer?: ReturnType<typeof setTimeout>;
  protected readonly statusOptions = computed<SelectOption[]>(() =>
    (['Scheduled', 'Done', 'Cancelled'] as const).map((s) => ({
      label: this.i18n.t(this.statusKey(s)),
      value: s,
    })),
  );

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

  // Student picker: everyone in the students list, plus the lesson's current name if it isn't
  // there (older lessons typed by hand).
  protected readonly studentOptions = computed<SelectOption[]>(() => {
    const names = this.students
      .students()
      .map((s) => s.name)
      .sort((a, b) => a.localeCompare(b, this.i18n.locale()));
    const current = this.editor()?.studentName;
    if (current && !names.includes(current)) names.unshift(current);
    return names.map((n) => ({ label: n, value: n }));
  });

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

  protected openNew(): void {
    const d = this.selectedDate();
    this.editor.set({
      id: null,
      title: '',
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
      title: this.titles.get(lesson.id),
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
    return new Date(y, mo - 1, d).toLocaleDateString(this.i18n.locale(), {
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

  // Save is enabled only for a valid form that actually differs from what was opened.
  protected canSave(m: EditorModel): boolean {
    return !!m.studentName.trim() && !this.isInvalid(m) && this.isDirty(m);
  }

  // Color of the calendar a lesson belongs to (bar on the left of each row). One calendar
  // for now; a Google Calendar integration would give each calendar its own color.
  protected lessonColor(_lesson: Lesson): string {
    return 'var(--calendar-default)';
  }

  // Id of the student with this name in the students list (null for names typed by hand).
  protected studentId(name: string): string | null {
    return this.students.students().find((s) => s.name === name)?.id ?? null;
  }

  // Leave the editor and show that student's card.
  protected openStudent(id: string): void {
    this.closeEditor();
    this.router.navigate(['/students'], { queryParams: { id } });
  }

  protected lessonTitle(lesson: Lesson): string {
    return this.titles.get(lesson.id);
  }

  protected statusKey(status: LessonStatus): TranslationKey {
    return `lesson.status.${status}`;
  }

  protected isInvalid(m: EditorModel): boolean {
    return timeToMin(m.endTime) <= timeToMin(m.startTime);
  }

  // Animates the page sheet out; its (closed) output then clears the editor.
  protected closeEditor(): void {
    this.page()?.close();
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
    const title = m.title.trim();
    if (m.id) {
      this.titles.set(m.id, title);
      this.service.update(m.id, input, from, to);
    } else {
      this.service.create(input, from, to, (id) => this.titles.set(id, title));
    }
    this.closeEditor();
  }

  protected remove(): void {
    const m = this.editor();
    if (!m?.id) return;
    const { from, to } = this.loadRange();
    this.service.remove(m.id, from, to);
    this.titles.remove(m.id);
    this.closeEditor();
  }
}
