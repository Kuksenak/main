import { Component, input, model } from '@angular/core';
import { Icon } from '../icon/icon';

/** An option of a `<ui-select>`: its value, its words. */
export interface UiOption {
  value: string;
  label: string;
}

/**
 * A choice of a few (the system's own: on phones iOS's menu / wheel, on desktops the browser's
 * list) — shown as a chip with the chosen one's words and ▾. `[(value)]`, `options`.
 *   <ui-select [options]="levels" [(value)]="level" />
 */
@Component({
  selector: 'ui-select',
  imports: [Icon],
  host: { class: 'relative inline-flex' },
  template: `
    <span class="pointer-events-none inline-flex h-button items-center gap-1 rounded-full bg-tint pr-2 pl-3.5 text-ui text-fg mobile:text-body">
      {{ chosen() }}
      <app-icon name="chevron-down" class="size-4 text-icon" />
    </span>
    <!-- (the system's own select over the chip, unseen: a tap opens its menu) -->
    <select
      class="absolute inset-0 cursor-pointer opacity-0"
      (change)="value.set($any($event.target).value)"
      [attr.aria-label]="label() || null"
    >
      @for (option of options(); track option.value) {
        <option [value]="option.value" [selected]="option.value === value()">{{ option.label }}</option>
      }
    </select>
  `,
})
export class UiSelect {
  readonly options = input.required<UiOption[]>();
  readonly value = model<string | null>(null);
  readonly label = input('');

  protected chosen(): string {
    return this.options().find((o) => o.value === this.value())?.label ?? '—';
  }
}
