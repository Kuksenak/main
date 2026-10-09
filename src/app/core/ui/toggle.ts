import { Component, inject, input, model } from '@angular/core';
import { DeviceDetectionService } from '../services/device-detection.service';

/**
 * On / off switch, two-way bound: `<app-toggle [(checked)]="on" />`.
 * Mobile: the native switch (`<input type="checkbox" switch>` — the system switch on iOS 17.4+,
 * a checkbox elsewhere). Desktop: a compact switch in the accent color.
 */
@Component({
  selector: 'app-toggle',
  host: { class: 'inline-flex shrink-0' },
  template: `
    @if (device.isMobile()) {
      <input
        type="checkbox"
        switch
        [checked]="checked()"
        [disabled]="disabled()"
        (change)="onNative($event)"
        class="shrink-0 disabled:opacity-40"
      />
    } @else {
      <!-- Compact (36 × 20), accent when on, a soft gray track when off; keyboard focus ring -->
      <button
        type="button"
        role="switch"
        [attr.aria-checked]="checked()"
        [disabled]="disabled()"
        (click)="toggle()"
        class="relative block h-5 w-9 shrink-0 cursor-pointer rounded-full p-0 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 active:!scale-100 disabled:cursor-default disabled:opacity-40"
        [class.bg-[var(--accent)]]="checked()"
        [class.hover:brightness-110]="checked()"
        [class.bg-[color-mix(in_srgb,var(--text)_18%,transparent)]]="!checked()"
        [class.hover:bg-[color-mix(in_srgb,var(--text)_26%,transparent)]]="!checked()"
      >
        <!-- The knob, placed exactly: 2px in from the edges -->
        <span
          class="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
          [class.translate-x-4]="checked()"
        ></span>
      </button>
    }
  `,
})
export class Toggle {
  protected device = inject(DeviceDetectionService);

  readonly checked = model(false);
  readonly disabled = input(false);

  protected toggle(): void {
    if (!this.disabled()) this.checked.set(!this.checked());
  }

  protected onNative(event: Event): void {
    if (!this.disabled()) this.checked.set((event.target as HTMLInputElement).checked);
  }
}
