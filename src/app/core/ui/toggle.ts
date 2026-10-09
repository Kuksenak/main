import { Component, inject, input, model } from '@angular/core';
import { DeviceDetectionService } from '../services/device-detection.service';

/**
 * On / off switch, two-way bound: `<app-toggle [(checked)]="on" />`.
 * Phones with Safari 17.4+: the native system switch (`<input type="checkbox" switch>`).
 * Everywhere else (other mobile browsers, which would show a plain checkbox, and desktop): our
 * own switch, iOS-sized on phones, compact on desktop.
 */
@Component({
  selector: 'app-toggle',
  host: { class: 'inline-flex shrink-0' },
  template: `
    @if (native) {
      <input
        type="checkbox"
        switch
        [checked]="checked()"
        [disabled]="disabled()"
        (change)="onNative($event)"
        class="shrink-0 disabled:opacity-40"
      />
    } @else {
      <!-- Our own: iOS size on phones (51 × 31), compact on desktop (36 × 20); accent when on, a
           soft gray track when off; the knob placed exactly, 2px in from the edges -->
      <button
        type="button"
        role="switch"
        [attr.aria-checked]="checked()"
        [disabled]="disabled()"
        (click)="toggle()"
        class="relative block h-[1.9375rem] w-[3.1875rem] shrink-0 cursor-pointer rounded-full p-0 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:!scale-100 disabled:cursor-default disabled:opacity-40 desktop:h-5 desktop:w-9"
        [class.bg-[var(--accent)]]="checked()"
        [class.hover:brightness-110]="checked()"
        [class.bg-[color-mix(in_srgb,var(--text)_18%,transparent)]]="!checked()"
        [class.hover:bg-[color-mix(in_srgb,var(--text)_26%,transparent)]]="!checked()"
      >
        <span
          class="absolute left-0.5 top-0.5 size-[1.6875rem] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] desktop:size-4"
          [class.translate-x-5]="checked()"
          [class.desktop:translate-x-4]="checked()"
        ></span>
      </button>
    }
  `,
})
export class Toggle {
  private device = inject(DeviceDetectionService);
  // Only Safari draws `switch` checkboxes as switches (it then exposes the property).
  protected readonly native = this.device.isMobile() && 'switch' in HTMLInputElement.prototype;

  readonly checked = model(false);
  readonly disabled = input(false);

  protected toggle(): void {
    if (!this.disabled()) this.checked.set(!this.checked());
  }

  protected onNative(event: Event): void {
    if (!this.disabled()) this.checked.set((event.target as HTMLInputElement).checked);
  }
}
