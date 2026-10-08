import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, of } from 'rxjs';
import { environment } from '@environments/environment';
import { TranslationKey } from '../core/i18n/translations';
import { LoadingService } from '../core/services/loading.service';

export type LessonStatus = 'Scheduled' | 'Done' | 'Cancelled';
export const LESSON_STATUSES: LessonStatus[] = ['Scheduled', 'Done', 'Cancelled'];

// Lessons are loaded for a window around today: 26 weeks back, 53 weeks in total, starting
// on a Monday. The schedule's scrollable calendar covers exactly this window.
const WEEKS_BEFORE = 26;
export const LESSON_WEEKS_TOTAL = 53;

export function lessonWindow(): { from: Date; to: Date } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - ((from.getDay() + 6) % 7) - WEEKS_BEFORE * 7);
  const to = new Date(from);
  to.setDate(to.getDate() + LESSON_WEEKS_TOTAL * 7);
  return { from, to };
}

export interface Lesson {
  id: string;
  title: string | null;
  studentId: string | null; // who it's for: a student …
  groupId: string | null; // … or a group
  studentName: string; // that student's / group's name (or the saved name for older lessons)
  startsAt: string;
  durationMinutes: number;
  status: LessonStatus;
  note: string | null;
}

export interface LessonInput {
  title: string | null;
  studentId: string | null;
  groupId: string | null;
  startsAt: string;
  durationMinutes: number;
  note: string | null;
  status: LessonStatus;
}

/** Who a lesson is for: a student or a group (one id set), with its name. */
export interface LessonWho {
  studentId: string | null;
  groupId: string | null;
  name: string;
}

export function lessonWho(l: Lesson): LessonWho {
  return { studentId: l.studentId, groupId: l.groupId, name: l.studentName };
}

/** When a lesson ends. */
export function lessonEnd(l: Lesson): Date {
  return new Date(new Date(l.startsAt).getTime() + l.durationMinutes * 60_000);
}

/** Translation key of a lesson status. */
export function statusKey(status: LessonStatus): TranslationKey {
  return `lesson.status.${status}`;
}

@Injectable({ providedIn: 'root' })
export class LessonService {
  private http = inject(HttpClient);
  private loadingService = inject(LoadingService);
  private base = `${environment.apiUrl}/lessons`;

  private _lessons = signal<Lesson[]>([]);
  readonly lessons = this._lessons.asReadonly();
  private loaded = false;

  /** Load the lesson window unless something already did. */
  ensureLoaded(): void {
    if (!this.loaded) this.reload();
  }

  create(input: LessonInput): void {
    this.http
      .post(this.base, input)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.reload());
  }

  update(id: string, input: LessonInput): void {
    this.http
      .put(`${this.base}/${id}`, input)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.reload());
  }

  remove(id: string): void {
    this.http
      .delete(`${this.base}/${id}`)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.reload());
  }

  /** (Re)load the lesson window — also after students / groups change (names, links). */
  reload(): void {
    this.loaded = true;
    this.loadingService.begin();
    const { from, to } = lessonWindow();
    const params = { from: from.toISOString(), to: to.toISOString() };
    this.http
      .get<{ lessons: Lesson[] }>(this.base, { params })
      .pipe(
        catchError(() => of({ lessons: [] })),
        finalize(() => this.loadingService.end()),
      )
      .subscribe((res) => this._lessons.set(res.lessons ?? []));
  }
}
