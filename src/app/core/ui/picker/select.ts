import { Component, input, model, signal } from '@angular/core';
import { desktop } from '../../device';
import { Icon, IconName } from '../icon/icon';

/** An option of a `<ui-select>`: its value, its words, an icon before them (on the chip; in the menu on desktops — iOS's own has none). */
export interface UiOption {
  value: string;
  label: string;
  icon?: IconName;
}

/**
 * A choice of a few, shown as a chip with the chosen one's words and ▾. Phones: the system's own
 * select (iOS's menu); desktops: our menu under the chip (as the app's others: the rows — an icon
 * each, if they have one — ✓ at the chosen one; the chosen one's icon on the chip too). `[(value)]`, `options`.
 *   <ui-select [options]="levels" [(value)]="level" />
 */
@Component({
  selector: 'ui-select',
  imports: [Icon],
  host: { class: 'relative inline-flex' },
  template: `
    @if (desktop) {
      <button
        type="button"
        (click)="open.set(!open())"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="label() || null"
        class="inline-flex h-button items-center gap-1.5 rounded-full bg-tint pr-2 pl-3.5 text-ui text-fg hover:bg-tint-strong"
        [class.pl-2.5]="!!chosenIcon()"
      >
        @if (chosenIcon(); as icon) {
          <app-icon [name]="icon" colored class="size-5 text-icon" />
        }
        {{ chosen() }}
        <app-icon name="chevron-down" class="size-4 text-icon" />
      </button>
      @if (open()) {
        <div class="fixed inset-0 z-40" (click)="open.set(false)"></div>
        <div role="listbox" class="absolute top-full left-0 z-50 mt-1.5 flex w-max min-w-[200%] animate-menu-in flex-col rounded-menu bg-dialog p-1 text-fg shadow-popover">
          @for (option of options(); track option.value) {
            <button
              type="button"
              role="option"
              [attr.aria-selected]="option.value === value()"
              (click)="value.set(option.value); open.set(false)"
              class="flex min-h-menu-row w-full items-center gap-2 rounded-button px-menu-row-x py-1 text-left text-ui hover:bg-tint-strong"
            >
              @if (option.icon) {
                <app-icon [name]="option.icon" colored class="size-icon-menu text-icon" />
              }
              <span class="flex-1">{{ option.label }}</span>
              @if (option.value === value()) {
                <app-icon name="check" class="size-icon-menu" />
              }
            </button>
          }
        </div>
      }
    } @else {
      <span class="pointer-events-none inline-flex h-button items-center gap-1.5 rounded-full bg-tint pr-2 pl-3.5 text-body text-fg" [class.pl-2.5]="!!chosenIcon()">
        @if (chosenIcon(); as icon) {
          <app-icon [name]="icon" colored class="size-6 text-icon" />
        }
        {{ chosen() }}
        <app-icon name="chevron-down" class="size-4 text-icon" />
      </span>
      <!-- (the system's own select over the chip, unseen: a tap opens iOS's menu) -->
      <select class="absolute inset-0 opacity-0" (change)="value.set($any($event.target).value)" [attr.aria-label]="label() || null">
        @for (option of options(); track option.value) {
          <option [value]="option.value" [selected]="option.value === value()">{{ option.label }}</option>
        }
      </select>
    }
  `,
})
export class UiSelect {
  readonly options = input.required<UiOption[]>();
  readonly value = model<string | null>(null);
  readonly label = input('');

  protected readonly desktop = desktop;
  protected readonly open = signal(false);

  protected chosenIcon(): IconName | undefined {
    return this.options().find((o) => o.value === this.value())?.icon;
  }

  protected chosen(): string {
    return this.options().find((o) => o.value === this.value())?.label ?? '—';
  }
}
