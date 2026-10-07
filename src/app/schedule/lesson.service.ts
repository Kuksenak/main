import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, of, tap } from 'rxjs';
import { environment } from '@environments/environment';

export type LessonStatus = 'Scheduled' | 'Done' | 'Cancelled';

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
  private base = `${environment.apiUrl}/lessons`;

  private _lessons = signal<Lesson[]>([]);
  private _loading = signal(false);
  readonly lessons = this._lessons.asReadonly();
  readonly loading = this._loading.asReadonly();

  load(from: Date, to: Date): void {
    this._loading.set(true);
    const params = { from: from.toISOString(), to: to.toISOString() };
    this.http
      .get<{ lessons: Lesson[] }>(this.base, { params })
      .pipe(
        catchError(() => of({ lessons: [] })),
        finalize(() => this._loading.set(false)),
      )
      .subscribe((res) => this._lessons.set(res.lessons ?? []));
  }

  create(input: LessonInput, from: Date, to: Date): void {
    this.http
      .post(this.base, input)
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.load(from, to));
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
