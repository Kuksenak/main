import { afterNextRender, Component, effect, ElementRef, input, model, output, signal, viewChild } from '@angular/core';
import { UiEmpty } from '../empty/empty';
import { IconName } from '../icon/icon';
import { UiRow } from '../row/row';
import { UiWindow } from '../window/window';
import { UiWindowField, UiWindowFoot, UiWindowHead, UiWindowKey } from '../window/window-parts';

/** A result of a `<ui-search-window>`: its icon, its name (a hint after it, gray), the section it's under. */
export interface UiSearchResult {
  id: string;
  section: string;
  label: string;
  hint?: string;
  icon: IconName;
}

/**
 * A search window, as Notion's (the shared `ui-window`; results 36 tall) — the field with its
 * loupe (`[(query)]`), the `results` under it by section (a section's name small and gray over its
 * first one; a result: its icon, its name, a hint after a dash), the picked one gray; at the bottom,
 * under a hairline, the keys (Esc, ↑↓, ↵). ↑ ↓ move, ↵ or a click picks (`picked`), Esc or a click
 * outside closes (`closed`). What's found is the page's to say: it gives the results for the query.
 * Render it with @if.
 */
@Component({
  selector: 'ui-search-window',
  imports: [UiEmpty, UiRow, UiWindow, UiWindowField, UiWindowFoot, UiWindowHead, UiWindowKey],
  templateUrl: './search-window.html',
})
export class UiSearchWindow {
  readonly results = input.required<readonly UiSearchResult[]>();
  readonly query = model('');
  readonly placeholder = input('');
  /** Shown when nothing is found. */
  readonly empty = input('');
  /** The keys' names at the bottom: [close, move, open]. */
  readonly keys = input<readonly [string, string, string]>(['', '', '']);

  readonly picked = output<UiSearchResult>();
  readonly closed = output<void>();

  protected readonly index = signal(0);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  constructor() {
    // (new results: the first one picked)
    effect(() => {
      this.results();
      this.index.set(0);
    });
    afterNextRender(() => this.field().nativeElement.focus());
  }

  protected key(e: KeyboardEvent): void {
    const n = this.results().length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!n) return;
      this.index.set((this.index() + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
      // (the picked one kept in view)
      queueMicrotask(() => this.list()?.nativeElement.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' }));
    } else if (e.key === 'Enter') {
      const result = this.results()[this.index()];
      if (result) this.picked.emit(result);
    }
  }
}
