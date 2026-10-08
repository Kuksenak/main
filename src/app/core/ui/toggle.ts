import { Component, inject, input, model } from '@angular/core';
import { DeviceDetectionService } from '../services/device-detection.service';

/**
 * On / off switch, two-way bound: `<app-toggle [(checked)]="on" />`.
 * Mobile: the native switch (`<input type="checkbox" switch>` — the system switch on iOS 17.4+,
 * a checkbox elsewhere). Desktop: an iOS-like switch.
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
      <button
        type="button"
        role="switch"
        [attr.aria-checked]="checked()"
        [disabled]="disabled()"
        (click)="toggle()"
        class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-colors duration-300 active:!scale-100 disabled:opacity-40"
        [class.bg-[var(--success)]]="checked()"
        [class.bg-[var(--fill)]]="!checked()"
      >
        <span
          class="ml-0.5 size-5 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          [class.translate-x-5]="checked()"
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
