import { booleanAttribute, Component, input, model } from '@angular/core';

/**
 * An on / off switch (as iOS's): `<ui-toggle [(checked)]="on" />` — a gray track, the accent when
 * on, a white knob sliding across; iOS's size on phones (51 × 31), smaller on desktop (44 × 24).
 * `disabled`: shown, not changed (e.g. locked). `label`: what it switches, for screen readers.
 */
@Component({
  selector: 'ui-toggle',
  host: { class: 'inline-flex shrink-0' },
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="checked.set(!checked())"
      class="group relative block h-toggle w-toggle-w shrink-0 rounded-full bg-fg/15 outline-none transition-colors duration-200
             focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:transform-none disabled:cursor-default
             disabled:opacity-40 aria-checked:bg-accent"
    >
      <span
        class="absolute top-0.5 left-0.5 size-toggle-knob rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-[translate]
               duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] group-aria-checked:translate-x-[calc(var(--toggle-w)-var(--toggle-h))]"
      ></span>
    </button>
  `,
})
export class UiToggle {
  readonly checked = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly label = input<string>();
}
