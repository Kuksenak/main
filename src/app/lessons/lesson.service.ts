import { Injectable, computed, inject } from '@angular/core';
import { ResourceStore } from '../core/services/resource-store';
import { EventService } from '../schedule/event.service';

export type LessonBlockKind = 'text' | 'link';

/** One piece of a lesson: a text, or a link (url, with an optional label in `text`). */
export interface LessonBlock {
  kind: LessonBlockKind;
  text: string | null;
  url: string | null;
}

/** Lesson material from the library, attached to events. */
export interface Lesson {
  id: string;
  title: string;
  blocks: LessonBlock[];
  updatedAt: string;
}

export interface LessonInput {
  title: string;
  blocks: LessonBlock[];
}

/** The account's lesson library (API: /lessons). */
@Injectable({ providedIn: 'root' })
export class LessonService extends ResourceStore<Lesson, LessonInput> {
  private events = inject(EventService);

  readonly lessons = computed(() => this.items());

  constructor() {
    super('lessons', 'lessons');
  }

  // A deleted lesson is detached from its events.
  protected override afterChange(): void {
    this.events.reload();
  }
}
