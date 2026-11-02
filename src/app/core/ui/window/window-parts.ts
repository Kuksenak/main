import { Component, Directive, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A window's head, as the search's: its icon at the left (`colored`: coloured in), then what's put
 * in — a field (`<input uiWindowField>`) or its name.
 *   <ui-window-head icon="search"><input uiWindowField … /></ui-window-head>
 */
@Component({
  selector: 'ui-window-head',
  imports: [Icon],
  host: { class: 'flex h-12 shrink-0 items-center gap-3 px-4.5 text-base text-fg' },
  template: `
    @if (colored()) {
      <app-icon [name]="icon()" colored class="size-5 shrink-0 text-icon" />
    } @else {
      <app-icon [name]="icon()" class="size-5 shrink-0 text-icon" />
    }
    <ng-content />
  `,
})
export class UiWindowHead {
  readonly icon = input.required<IconName>();
  readonly colored = input(false);
}

/** The field in a window's head: the rest of the row, no edge, the base text. */
@Directive({
  selector: 'input[uiWindowField]',
  host: {
    type: 'text',
    autocomplete: 'off',
    class: 'min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-secondary',
  },
})
export class UiWindowField {}

/**
 * A window's foot, under a hairline: the keys (`<ui-window-key>`), then anything at the right
 * (a note, a button).
 */
@Component({
  selector: 'ui-window-foot',
  host: {
    class: 'flex h-11 shrink-0 items-center gap-5 border-t-[0.5px] border-separator pr-3 pl-5 text-footnote text-fg-secondary',
  },
  template: `<ng-content />`,
})
export class UiWindowFoot {}

/** A key and what it does, in a window's foot: `key` its name ("Esc"), or its icons (`icons`: ↑ ↓, ↵). */
@Component({
  selector: 'ui-window-key',
  imports: [Icon],
  host: { class: 'flex items-center gap-1.5' },
  template: `
    <kbd class="flex font-sans">
      {{ key() }}
      @for (name of icons(); track name) {
        <app-icon [name]="name" class="size-4" />
      }
    </kbd>
    <ng-content />
  `,
})
export class UiWindowKey {
  readonly key = input('');
  readonly icons = input<readonly IconName[]>([]);
}
