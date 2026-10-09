import { Component, inject, output, signal } from '@angular/core';
import { TranslatePipe } from '../i18n/t.pipe';
import { DeviceDetectionService } from '../services/device-detection.service';

/**
 * "Delete? This can't be undone." — iOS style: on mobile an action sheet (the message and a red
 * Delete in one rounded group, a separate bold Cancel below); on desktop an alert (title,
 * message, Cancel | Delete side by side under a hairline). The backdrop cancels too.
 * Render it with @if; `confirmed` fires on Delete, `closed` once it's gone either way.
 */
@Component({
  selector: 'app-confirm-delete',
  imports: [TranslatePipe],
  template: `
    <div
      class="fixed inset-0 z-50 flex bg-black/35 transition-opacity duration-200 [animation:fadeIn_200ms_ease-out]"
      [class.items-end]="!desktop"
      [class.items-center]="desktop"
      [class.justify-center]="desktop"
      [class.opacity-0]="closing()"
      (click)="close()"
    >
      @if (desktop) {
        <div role="alertdialog" class="w-[17rem] overflow-hidden rounded-2xl bg-[var(--dialog-bg)] text-center text-[var(--text)] shadow-[var(--shadow-dialog)] [animation:dropdownIn_200ms_var(--ease-out-quick)]" (click)="$event.stopPropagation()">
          <div class="flex flex-col gap-1 px-4 pb-4 pt-5">
            <p class="text-body font-semibold">{{ 'confirm.deleteTitle' | t }}</p>
            <p class="text-footnote opacity-70">{{ 'confirm.deleteText' | t }}</p>
          </div>
          <div class="grid grid-cols-2 border-t border-[var(--separator)]">
            <button type="button" (click)="close()" class="active:![transform:none] text-body h-11 border-r border-[var(--separator)] text-[var(--accent)] hover:bg-[var(--highlight)]">{{ 'action.cancel' | t }}</button>
            <button type="button" (click)="confirm()" class="active:![transform:none] text-body h-11 font-semibold text-[var(--danger)] hover:bg-[var(--highlight)]">{{ 'action.delete' | t }}</button>
          </div>
        </div>
      } @else {
        <div
          role="alertdialog"
          class="flex w-full flex-col gap-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-transform duration-200 [animation:sheetUp_300ms_var(--ease-ios)]"
          [class.translate-y-full]="closing()"
          (click)="$event.stopPropagation()"
        >
          <div class="overflow-hidden rounded-[0.875rem] bg-[color-mix(in_srgb,var(--dialog-bg)_92%,transparent)] text-center backdrop-blur-xl">
            <div class="flex flex-col gap-0.5 px-4 py-3.5">
              <p class="text-footnote font-semibold opacity-60">{{ 'confirm.deleteTitle' | t }}</p>
              <p class="text-footnote opacity-60">{{ 'confirm.deleteText' | t }}</p>
            </div>
            <button type="button" (click)="confirm()" class="active:![transform:none] h-14 w-full border-t border-[var(--separator)] text-[1.25rem] text-[var(--danger)] active:bg-[var(--highlight)]">{{ 'action.delete' | t }}</button>
          </div>
          <button type="button" (click)="close()" class="active:![transform:none] h-14 w-full rounded-[0.875rem] bg-[var(--dialog-bg)] text-[1.25rem] font-semibold text-[var(--accent)] active:bg-[var(--highlight)]">{{ 'action.cancel' | t }}</button>
        </div>
      }
    </div>
  `,
})
export class ConfirmDelete {
  readonly confirmed = output<void>();
  readonly closed = output<void>();

  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly closing = signal(false);

  protected confirm(): void {
    this.confirmed.emit();
    this.close();
  }

  protected close(): void {
    if (this.closing()) return;
    this.closing.set(true);
    setTimeout(() => this.closed.emit(), 200);
  }
}
