import { afterNextRender, booleanAttribute, Component, Directive, ElementRef, inject, input, model, output } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';
import { Icon, IconName } from '../icon/icon';

/**
 * A window's head, as the search's: its icon at the left, then what's put
 * in — a field (`<input uiWindowField>`) or its name.
 *   <ui-window-head icon="search"><input uiWindowField … /></ui-window-head>
 */
@Component({
  selector: 'ui-window-head',
  imports: [Icon],
  host: { class: 'flex h-12 shrink-0 items-center gap-3 px-4.5 text-body text-fg' },
  template: `
    <app-icon [name]="icon()" class="size-5 shrink-0 text-icon" />
    <ng-content />
  `,
})
export class UiWindowHead {
  readonly icon = input.required<IconName>();
}

/** The field in a window's head: the rest of the row, no edge, the base text — the caret in it as the window opens. */
@Directive({
  selector: 'input[uiWindowField]',
  host: {
    type: 'text',
    autocomplete: 'off',
    class: 'min-w-0 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-secondary',
  },
})
export class UiWindowField {
  constructor() {
    const el: HTMLInputElement = inject(ElementRef).nativeElement;
    afterNextRender(() => el.focus());
  }
}

/**
 * The keys of a window's list, on its head's field (as the search's): ↑ ↓ move the picked row
 * (`[(index)]`, round at the ends; the window's `aria-selected` row kept in view), ↵ — `chosen`
 * with it. `count`: the list's rows.
 *   <input uiWindowField uiListKeys [count]="rows().length" [(index)]="index" (chosen)="open($event)" />
 */
@Directive({
  selector: 'input[uiListKeys]',
  host: { '(keydown)': 'key($event)' },
})
export class UiListKeys {
  readonly count = input.required<number>();
  readonly index = model<number | null>(0);
  readonly chosen = output<number>();

  private readonly el: HTMLElement = inject(ElementRef).nativeElement;

  protected key(e: KeyboardEvent): void {
    const n = this.count();
    const at = Math.min(this.index() ?? 0, n - 1);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!n) return;
      this.index.set((at + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
      queueMicrotask(() => this.el.closest('[role=dialog]')?.querySelector('[aria-selected=true]')?.scrollIntoView({ block: 'nearest' }));
    } else if (e.key === 'Enter' && n) {
      e.preventDefault();
      this.chosen.emit(at);
    }
  }
}

/**
 * A window's list under its head (the search's results, the trash's pages): the rest of the window,
 * scrolling, the rows a little in from its sides. (`role="listbox"` on it where the keys pick a row.)
 */
@Component({
  selector: 'ui-window-list',
  host: { class: 'flex min-h-0 flex-1 flex-col overflow-y-auto px-3.5 pt-1 pb-2' },
  template: `<ng-content />`,
})
export class UiWindowList {}

/** A section's name in a window's list, small and gray, over its first row (as Notion's search). */
@Component({
  selector: 'ui-window-section',
  host: { class: 'block px-2 pt-3 pb-1.5 text-footnote font-medium text-fg-secondary' },
  template: `<ng-content />`,
})
export class UiWindowSection {}

/**
 * A window's foot, under a hairline: a note, a button (the trash's: its note and Empty trash).
 */
@Component({
  selector: 'ui-window-foot',
  host: {
    class: 'flex h-11 shrink-0 items-center gap-5 border-t-[0.5px] border-separator pr-3 pl-5 text-footnote text-fg-secondary',
  },
  template: `<ng-content />`,
})
export class UiWindowFoot {}

