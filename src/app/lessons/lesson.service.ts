import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { environment } from '@environments/environment';
import { catchError, of } from 'rxjs';
import { ResourceStore } from '../core/services/resource-store';
import { EventService } from '../schedule/event.service';

export type LessonBlockKind = 'text' | 'checklist' | 'exercise' | 'gaps' | 'image' | 'heading' | 'link';

/**
 * One piece of a lesson: a text, a checklist (`items`), an exercise (the question in `text`,
 * `options`, the right one's index in `answer`), gaps to fill in (`text` with the answers in
 * [brackets], see gaps.ts), pictures (`url`: the picture's id, see imageSrc; a caption in `text`);
 * older lessons also have headings and links (url,
 * an optional label in `text`). `private`: for the teacher only (the public link leaves it out).
 */
export interface LessonBlock {
  kind: LessonBlockKind;
  text: string | null;
  url: string | null;
  private?: boolean;
  items?: string[] | null;
  options?: string[] | null;
  answer?: number | null;
  instruction?: string | null; // a task's: what to do (its items in `text`)
}

/** A picture block's image (its id → the address it's served at). */
export function imageSrc(id: string | null): string {
  return `${environment.apiUrl}/lesson-images/${id ?? ''}`;
}

/** Lesson material from the library, attached to events. */
export interface Lesson {
  id: string;
  title: string;
  blocks: LessonBlock[];
  updatedAt: string;
  shareToken: string | null; // public link token (/l/:token); null = private
  level?: Level | null;
}

/** The students' level a lesson is for (CEFR). */
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Level = (typeof LEVELS)[number];

/** A level's color (a pastel; tokens.css), or null for none. */
export function levelColor(level: Level | null | undefined): string | null {
  return level ? `var(--level-${level.toLowerCase()})` : null;
}

/** The public link of a shared lesson. */
export function shareUrl(token: string): string {
  return `${location.origin}/l/${token}`;
}

export interface LessonInput {
  title: string;
  blocks: LessonBlock[];
  level?: Level | null;
}

/** The account's lesson library (API: /lessons). */
@Injectable({ providedIn: 'root' })
export class LessonService extends ResourceStore<Lesson, LessonInput> {
  private events = inject(EventService);
  private api = inject(HttpClient);

  readonly lessons = computed(() => this.items());

  constructor() {
    super('lessons', 'lessons');
  }

  /** Turn the public link on (`done` gets its token) or off. */
  share(id: string, on: boolean, done?: (token: string | null) => void): void {
    const url = `${environment.apiUrl}/lessons/${id}/share`;
    (on ? this.api.post<{ token: string | null }>(url, {}) : this.api.delete<{ token: string | null }>(url))
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        done?.(res?.token ?? null);
        this.reload();
      });
  }

  // A deleted lesson is detached from its events.
  protected override afterChange(): void {
    this.events.reload();
  }
}
