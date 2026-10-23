import { Component, computed, input } from '@angular/core';

/** A person's initial (the name's, else the email's) on a small gray square, in an icon's place. */
@Component({
  selector: 'ui-avatar',
  host: { 'aria-hidden': 'true' },
  template: `{{ initial() }}`,
  styles: `
    :host {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: var(--icon-ui);
      height: var(--icon-ui);
      border-radius: var(--radius-button);
      background: var(--tint-strong);
      font-size: calc(var(--icon-ui) * 0.6);
      font-weight: 500;
      line-height: 1;
    }
  `,
})
export class UiAvatar {
  readonly name = input<string | null>('');
  protected readonly initial = computed(() => (this.name() ?? '').trim().charAt(0).toUpperCase() || '?');
}
