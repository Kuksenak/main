import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { catchError, of } from 'rxjs';
import { LessonService } from '../../lessons/lesson.service';
import { StudentService } from '../../students/student.service';
import { ToastService } from '../ui/toast';

export interface TrashItem {
  kind: 'lesson' | 'student';
  id: string;
  name: string;
  deletedAt: string;
}

/** The trash (API: /trash): deleted pages and students — restored, or deleted for good. */
@Injectable({ providedIn: 'root' })
export class TrashService {
  private readonly http = inject(HttpClient);
  private readonly lessons = inject(LessonService);
  private readonly students = inject(StudentService);
  private readonly toast = inject(ToastService);
  private readonly base = `${environment.apiUrl}/trash`;

  readonly items = signal<TrashItem[]>([]);
  readonly loading = signal(false);

  load(): void {
    this.loading.set(true);
    this.http
      .get<{ items: TrashItem[] }>(this.base)
      .pipe(catchError(() => of({ items: [] as TrashItem[] })))
      .subscribe((res) => {
        this.items.set(res.items ?? []);
        this.loading.set(false);
      });
  }

  /** Back where it was (its list reloaded). */
  restore(item: TrashItem): void {
    this.items.update((list) => list.filter((x) => x !== item));
    this.http
      .post(`${this.base}/${item.kind}/${item.id}/restore`, {})
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.reloadList(item);
        this.toast.show('toast.restored', { icon: 'restore' });
      });
  }

  /** Gone for good. */
  purge(item: TrashItem): void {
    this.items.update((list) => list.filter((x) => x !== item));
    this.http
      .delete(`${this.base}/${item.kind}/${item.id}`)
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  private reloadList(item: TrashItem): void {
    if (item.kind === 'lesson') this.lessons.reload();
    else this.students.reload();
  }
}
