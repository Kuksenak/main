import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-toggle',
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [disabled]="disabled()"
      (click)="toggle()"
      class="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-300 outline-none disabled:opacity-40"
      [style.background]="checked() ? 'var(--accent)' : null"
      [class.bg-neutral-300]="!checked()"
      [class.dark:bg-neutral-700]="!checked()"
    >
      <span
        class="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        [class.translate-x-5]="checked()"
      ></span>
    </button>
  `,
})
export class Toggle {
  readonly checked = model(false);
  readonly disabled = input(false);

  toggle(): void {
    if (!this.disabled()) {
      this.checked.set(!this.checked());
    }
  }
}
