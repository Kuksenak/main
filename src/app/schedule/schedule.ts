import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeviceDetectionService } from '../core/services/device-detection.service';
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
  imports: [FormsModule, DatePipe, TimeField, SelectField],
  templateUrl: './schedule.html',
})
export class Schedule {
  private service = inject(LessonService);

  protected readonly isMobile = inject(DeviceDetectionService).isMobile;
  protected readonly loading = this.service.loading;
  private touchStartY = 0;
  private touchStartX = 0;
  protected readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly statusOptions: SelectOption[] = [
    { label: 'Scheduled', value: 'Scheduled' },
    { label: 'Done', value: 'Done' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];

  protected readonly selectedDate = signal(startOfDay(new Date()));
  // Month shown in the grid follows the selected date.
  protected readonly month = computed(() => startOfMonth(this.selectedDate()));
  protected readonly gridStart = computed(() => startOfGrid(this.month()));
  protected readonly gridDays = computed(() =>
    Array.from({ length: 42 }, (_, i) => addDays(this.gridStart(), i)),
  );
  // Same days chunked into 6 weeks for row-by-row rendering.
  protected readonly weeks = computed(() => {
    const days = this.gridDays();
    return Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));
  });

  protected readonly editor = signal<EditorModel | null>(null);

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
    effect(() => {
      const from = this.gridStart();
      this.service.load(from, addDays(from, 42));
    });

    // While the sheet is open, darken the status-bar theme-color so the top strip
    // (driven by the manifest) matches the dimmed backdrop instead of staying light.
    effect(() => {
      const open = this.editor() !== null;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) return;
      const dark = document.documentElement.classList.contains('dark');
      if (open) {
        meta.setAttribute('content', dark ? '#000000' : '#919191');
      } else {
        meta.setAttribute('content', dark ? '#000000' : '#f2f2f6');
      }
    });
  }

  private loadRange(): { from: Date; to: Date } {
    const from = this.gridStart();
    return { from, to: addDays(from, 42) };
  }

  protected countFor(day: Date): number {
    return this.byDay().get(toDateInput(day))?.length ?? 0;
  }

  protected inMonth(day: Date): boolean {
    return day.getMonth() === this.month().getMonth();
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

  protected prevMonth(): void {
    this.selectedDate.set(addMonths(this.selectedDate(), -1));
  }

  protected nextMonth(): void {
    this.selectedDate.set(addMonths(this.selectedDate(), 1));
  }

  protected today(): void {
    this.selectedDate.set(startOfDay(new Date()));
  }

  // Swipe up → next month, swipe down → previous month (mobile).
  protected onCalendarTouchStart(e: TouchEvent): void {
    this.touchStartY = e.changedTouches[0].clientY;
    this.touchStartX = e.changedTouches[0].clientX;
  }

  protected onCalendarTouchEnd(e: TouchEvent): void {
    const dy = e.changedTouches[0].clientY - this.touchStartY;
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    // Ignore taps and mostly-horizontal moves (those are day selections / scrolls).
    if (Math.abs(dy) < 45 || Math.abs(dy) < Math.abs(dx)) return;
    if (dy < 0) this.nextMonth();
    else this.prevMonth();
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

  protected isInvalid(m: EditorModel): boolean {
    return timeToMin(m.endTime) <= timeToMin(m.startTime);
  }

  protected closeEditor(): void {
    this.editor.set(null);
  }

  protected save(): void {
    const m = this.editor();
    if (!m || !m.studentName.trim() || this.isInvalid(m)) return;

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
