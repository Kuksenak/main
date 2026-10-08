import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, of } from 'rxjs';
import { environment } from '@environments/environment';
import { LoadingService } from '../core/services/loading.service';

export type LessonStatus = 'Scheduled' | 'Done' | 'Cancelled';

// Lessons are loaded for a window around today: 26 weeks back, 53 weeks in total, starting
// on a Monday. The schedule's scrollable calendar covers exactly this window.
export const LESSON_WEEKS_BEFORE = 26;
export const LESSON_WEEKS_TOTAL = 53;

export function lessonWindow(): { from: Date; to: Date } {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - ((from.getDay() + 6) % 7) - LESSON_WEEKS_BEFORE * 7);
  const to = new Date(from);
  to.setDate(to.getDate() + LESSON_WEEKS_TOTAL * 7);
  return { from, to };
}

export interface Lesson {
  id: string;
  studentName: string;
  startsAt: string;
  durationMinutes: number;
  status: LessonStatus;
  note: string | null;
}

export interface LessonInput {
  studentName: string;
  startsAt: string;
  durationMinutes: number;
  note: string | null;
  status: LessonStatus;
}

@Injectable({ providedIn: 'root' })
export class LessonService {
  private http = inject(HttpClient);
  private loadingService = inject(LoadingService);
  private base = `${environment.apiUrl}/lessons`;

  private _lessons = signal<Lesson[]>([]);
  readonly lessons = this._lessons.asReadonly();
  private loaded = false;

  /** Load the default window unless something already did (e.g. the schedule). */
  ensureLoaded(): void {
    if (this.loaded) return;
    const { from, to } = lessonWindow();
    this.load(from, to);
  }

  load(from: Date, to: Date): void {
    this.loaded = true;
    this.loadingService.begin();
    const params = { from: from.toISOString(), to: to.toISOString() };
    this.http
      .get<{ lessons: Lesson[] }>(this.base, { params })
      .pipe(
        catchError(() => of({ lessons: [] })),
        finalize(() => this.loadingService.end()),
      )
      .subscribe((res) => this._lessons.set(res.lessons ?? []));
  }

  create(input: LessonInput, from: Date, to: Date, onCreated?: (id: string) => void): void {
    this.http
      .post<{ id: string }>(this.base, input)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res?.id) onCreated?.(res.id);
        this.load(from, to);
      });
  }

  update(id: string, input: LessonInput, from: Date, to: Date): void {
    this.http
      .put(`${this.base}/${id}`, input)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.load(from, to));
  }

  remove(id: string, from: Date, to: Date): void {
    this.http
      .delete(`${this.base}/${id}`)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.load(from, to));
  }
}
