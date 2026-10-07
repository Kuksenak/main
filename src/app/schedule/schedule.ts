import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DateField } from '../core/ui/date/date';
import { SelectField, SelectOption } from '../core/ui/select/select';
import { TimeField } from '../core/ui/time/time';
import { Lesson, LessonService, LessonStatus } from './lesson.service';

interface EditorModel {
  id: string | null;
  studentName: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm
  durationMinutes: number;
  note: string;
  status: LessonStatus;
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
  imports: [FormsModule, DatePipe, NgClass, DateField, TimeField, SelectField],
  templateUrl: './schedule.html',
})
export class Schedule {
  private service = inject(LessonService);

  protected readonly loading = this.service.loading;
  protected readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly durationOptions: SelectOption[] = [
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '60 min', value: 60 },
    { label: '90 min', value: 90 },
    { label: '120 min', value: 120 },
  ];
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

  protected timeLabel(iso: string): string {
    return toTimeInput(new Date(iso));
  }

  // Stable Date reference for the <app-date> picker — recomputed only when the
  // editor changes, so the ngModel binding doesn't produce a new object per cycle.
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

  protected endLabel(iso: string, minutes: number): string {
    return toTimeInput(new Date(new Date(iso).getTime() + minutes * 60_000));
  }

  protected openNew(): void {
    const d = this.selectedDate();
    this.editor.set({
      id: null,
      studentName: '',
      date: toDateInput(d),
      time: '18:00',
      durationMinutes: 60,
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
      time: toTimeInput(start),
      durationMinutes: lesson.durationMinutes,
      note: lesson.note ?? '',
      status: lesson.status,
    });
  }

  protected closeEditor(): void {
    this.editor.set(null);
  }

  protected save(): void {
    const m = this.editor();
    if (!m || !m.studentName.trim()) return;

    const startsAt = new Date(`${m.date}T${m.time}`).toISOString();
    const input = {
      studentName: m.studentName.trim(),
      startsAt,
      durationMinutes: Number(m.durationMinutes) || 60,
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
