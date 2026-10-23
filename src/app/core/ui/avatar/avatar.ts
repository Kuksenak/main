import { Component, computed, input } from '@angular/core';

/** A person's initial (the name's, else the email's) on a small gray square, in an icon's place. */
@Component({
  selector: 'ui-avatar',
  host: {
    class:
      'grid size-icon-ui shrink-0 place-items-center rounded-button bg-tint-strong text-[calc(var(--icon-ui)*0.6)] leading-none font-medium',
    'aria-hidden': 'true',
  },
  template: `{{ initial() }}`,
})
export class UiAvatar {
  readonly name = input<string | null>('');
  protected readonly initial = computed(() => (this.name() ?? '').trim().charAt(0).toUpperCase() || '?');
}
