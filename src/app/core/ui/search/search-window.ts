import { Component, input, linkedSignal, model, output } from '@angular/core';
import { UiEmpty } from '../empty/empty';
import { IconName } from '../icon/icon';
import { UiRow } from '../row/row';
import { UiWindow } from '../window/window';
import { UiListKeys, UiWindowField, UiWindowHead, UiWindowList, UiWindowSection } from '../window/window-parts';

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
  imports: [UiEmpty, UiListKeys, UiRow, UiWindow, UiWindowField, UiWindowHead, UiWindowList, UiWindowSection],
  templateUrl: './search-window.html',
})
export class UiSearchWindow {
  readonly results = input.required<readonly UiSearchResult[]>();
  readonly query = model('');
  readonly placeholder = input('');
  /** Shown when nothing is found. */
  readonly empty = input('');
  /** What ↵ does, in the keys at the bottom (Open). */
  readonly enter = input('');

  readonly picked = output<UiSearchResult>();
  readonly closed = output<void>();

  // (new results: the first one picked)
  protected readonly index = linkedSignal<readonly UiSearchResult[], number | null>({ source: this.results, computation: () => 0 });
}
