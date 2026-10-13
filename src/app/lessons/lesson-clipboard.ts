import { Injectable, signal } from '@angular/core';
import { LessonBlock } from './lesson.service';

const KEY = 'lessons.clipboard';

/**
 * A lesson's tasks copied (⋯ → Copy page content), to paste into another one in place of its own (⋯ → Paste content).
 * Kept in this browser, so it outlives a reload; its text goes to the system clipboard too.
 */
@Injectable({ providedIn: 'root' })
export class LessonClipboard {
  readonly blocks = signal<LessonBlock[] | null>(read());

  copy(blocks: LessonBlock[]): void {
    this.blocks.set(blocks);
    try {
      localStorage.setItem(KEY, JSON.stringify(blocks));
    } catch {
      // (private window, storage off: kept for this visit only)
    }
    const text = blocks
      .map((b) => b.text?.trim() ?? '')
      .filter((t) => !!t)
      .join('\n\n');
    if (text) navigator.clipboard?.writeText(text).catch(() => {});
  }
}

function read(): LessonBlock[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return Array.isArray(v) && v.length ? v : null;
  } catch {
    return null;
  }
}
