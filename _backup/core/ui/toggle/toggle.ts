import { Component, inject, input, model } from '@angular/core';
import { DeviceDetectionService } from '../../services/device-detection.service';

@Component({
  selector: 'app-toggle',
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
        class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-colors duration-300 disabled:opacity-40"
        [style.background]="checked() ? 'var(--accent)' : null"
        [class.bg-neutral-300]="!checked()"
        [class.dark:bg-neutral-700]="!checked()"
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

  toggle(): void {
    if (!this.disabled()) {
      this.checked.set(!this.checked());
    }
  }

  onNative(event: Event): void {
    if (this.disabled()) return;
    this.checked.set((event.target as HTMLInputElement).checked);
  }
}
