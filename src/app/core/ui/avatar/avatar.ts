import { booleanAttribute, Component, computed, input } from '@angular/core';

/**
 * A person's initial (the name's, else the email's) on a small gray square, in an icon's place;
 * `dot`: a small green dot at its corner (e.g. an update ready).
 */
@Component({
  selector: 'ui-avatar',
  host: {
    class:
      'relative grid size-icon-ui shrink-0 place-items-center rounded-button bg-tint-strong text-[calc(var(--icon-ui)*0.6)] leading-none font-medium',
    'aria-hidden': 'true',
  },
  template: `
    {{ initial() }}
    @if (dot()) {
      <span class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-success ring-2 ring-side"></span>
    }
  `,
})
export class UiAvatar {
  readonly name = input<string | null>('');
  readonly dot = input(false, { transform: booleanAttribute });
  protected readonly initial = computed(() => (this.name() ?? '').trim().charAt(0).toUpperCase() || '?');
}
