import { booleanAttribute, Component, input, model } from '@angular/core';

/** One choice of a `<ui-segmented>`: its value and its (already translated) name. */
export interface UiSegment<T extends string = string> {
  value: T;
  label: string;
}

/**
 * A choice of a few (as iOS's segmented control): the options side by side on a gray capsule,
 * the chosen one raised on the dialogs' color. A tap picks one (`value`, two-way); `disabled`:
 * shown, not changed (e.g. locked). `label`: what it chooses, for screen readers.
 *   <ui-segmented [options]="levels" [(value)]="level" [label]="'Schedule'" />
 */
@Component({
  selector: 'ui-segmented',
  host: {
    class:
      'inline-flex h-segment shrink-0 items-stretch gap-0.5 rounded-button bg-tint-strong p-0.5 data-disabled:opacity-60',
    role: 'radiogroup',
    '[attr.aria-label]': 'label()',
    '[attr.aria-disabled]': 'disabled() || null',
    '[attr.data-disabled]': "disabled() ? '' : null",
  },
  templateUrl: './segmented.html',
})
export class UiSegmented<T extends string = string> {
  readonly options = input.required<readonly UiSegment<T>[]>();
  readonly value = model<T>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly label = input<string>();

  protected pick(value: T): void {
    if (!this.disabled() && value !== this.value()) this.value.set(value);
  }
}
