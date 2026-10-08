import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'lessonTitles';

/**
 * Lesson titles, kept on this device only (localStorage, keyed by lesson id) because the
 * lessons API has no title field yet. Move to the API when it gets one.
 */
@Injectable({ providedIn: 'root' })
export class LessonTitleStore {
  private readonly titles = signal<Record<string, string>>(this.read());

  get(id: string): string {
    return this.titles()[id] ?? '';
  }

  set(id: string, title: string): void {
    this.titles.update((t) => {
      const next = { ...t };
      if (title) next[id] = title;
      else delete next[id];
      return next;
    });
    this.write();
  }

  remove(id: string): void {
    this.set(id, '');
  }

  private read(): Record<string, string> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  }

  private write(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.titles()));
    } catch {
      /* storage unavailable — titles last for this session only */
    }
  }
}
