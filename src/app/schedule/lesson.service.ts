import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, of } from 'rxjs';
import { environment } from '@environments/environment';
import { LoadingService } from '../core/services/loading.service';

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
  private loadingService = inject(LoadingService);
  private base = `${environment.apiUrl}/lessons`;

  private _lessons = signal<Lesson[]>([]);
  readonly lessons = this._lessons.asReadonly();

  load(from: Date, to: Date): void {
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
