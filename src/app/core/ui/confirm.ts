import { Component, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../i18n/t.pipe';
import { TranslationKey } from '../i18n/translations';
import { DeviceDetectionService } from '../services/device-detection.service';

export interface ActionChoice {
  value: string;
  label: TranslationKey;
  danger?: boolean;
}

/**
 * A question with a few answers, iOS style: on mobile an action sheet (the message and the
 * answers in one rounded group, a separate bold Cancel below; no dimming — it would tint the
 * toolbar); on desktop an alert (title, message, Cancel and the answers under a hairline).
 * A click outside cancels. Render it with @if; `chosen` fires with the answer's value, `closed`
 * once it's gone either way.
 */
@Component({
  selector: 'app-action-sheet',
  imports: [TranslatePipe],
  template: `
    <div
      class="fixed inset-0 z-50 flex transition-opacity duration-200 [animation:fadeIn_200ms_ease-out]"
      [class.items-end]="!desktop"
      [class.items-center]="desktop"
      [class.justify-center]="desktop"
      [class.bg-black/35]="desktop"
      [class.opacity-0]="closing()"
      (click)="close()"
    >
      @if (desktop) {
        <div role="alertdialog" class="w-[17rem] overflow-hidden rounded-2xl bg-[var(--dialog-bg)] text-center text-[var(--text)] shadow-[var(--shadow-dialog)] [animation:dropdownIn_200ms_var(--ease-out-quick)]" (click)="$event.stopPropagation()">
          <div class="flex flex-col gap-1 px-4 pb-4 pt-5">
            <p class="text-body font-semibold">{{ title() | t }}</p>
            @if (message(); as msg) {
              <p class="text-footnote opacity-70">{{ msg | t }}</p>
            }
          </div>
          <div class="flex flex-col">
            @for (c of choices(); track c.value) {
              <button type="button" (click)="choose(c.value)" class="text-body h-11 border-t border-[var(--separator)] hover:bg-[var(--highlight)] active:![transform:none]" [class.text-[var(--danger)]]="c.danger" [class.text-[var(--accent)]]="!c.danger">{{ c.label | t }}</button>
            }
            <button type="button" (click)="close()" class="text-body h-11 border-t border-[var(--separator)] font-semibold text-[var(--accent)] hover:bg-[var(--highlight)] active:![transform:none]">{{ 'action.cancel' | t }}</button>
          </div>
        </div>
      } @else {
        <div
          role="alertdialog"
          class="flex w-full flex-col gap-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-transform duration-200 [animation:sheetUp_300ms_var(--ease-ios)]"
          [class.translate-y-full]="closing()"
          (click)="$event.stopPropagation()"
        >
          <div class="overflow-hidden rounded-[0.875rem] bg-[color-mix(in_srgb,var(--dialog-bg)_94%,transparent)] text-center shadow-[var(--shadow-dialog)] backdrop-blur-xl">
            <div class="flex flex-col gap-0.5 px-4 py-3.5">
              <p class="text-footnote font-semibold opacity-60">{{ title() | t }}</p>
              @if (message(); as msg) {
                <p class="text-footnote opacity-60">{{ msg | t }}</p>
              }
            </div>
            @for (c of choices(); track c.value) {
              <button type="button" (click)="choose(c.value)" class="h-14 w-full border-t border-[var(--separator)] text-[1.25rem] active:bg-[var(--highlight)] active:![transform:none]" [class.text-[var(--danger)]]="c.danger" [class.text-[var(--accent)]]="!c.danger">{{ c.label | t }}</button>
            }
          </div>
          <button type="button" (click)="close()" class="h-14 w-full rounded-[0.875rem] bg-[var(--dialog-bg)] text-[1.25rem] font-semibold text-[var(--accent)] shadow-[var(--shadow-dialog)] active:bg-[var(--highlight)] active:![transform:none]">{{ 'action.cancel' | t }}</button>
        </div>
      }
    </div>
  `,
})
export class ActionSheet {
  readonly title = input.required<TranslationKey>();
  readonly message = input<TranslationKey | null>(null);
  readonly choices = input.required<ActionChoice[]>();
  readonly chosen = output<string>();
  readonly closed = output<void>();

  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly closing = signal(false);

  protected choose(value: string): void {
    this.chosen.emit(value);
    this.close();
  }

  protected close(): void {
    if (this.closing()) return;
    this.closing.set(true);
    setTimeout(() => this.closed.emit(), 200);
  }
}

/** "Delete? This can't be undone." — Delete / Cancel (see ActionSheet). */
@Component({
  selector: 'app-confirm-delete',
  imports: [ActionSheet],
  template: `
    <app-action-sheet
      title="confirm.deleteTitle"
      message="confirm.deleteText"
      [choices]="choices"
      (chosen)="confirmed.emit()"
      (closed)="closed.emit()"
    />
  `,
})
export class ConfirmDelete {
  readonly confirmed = output<void>();
  readonly closed = output<void>();

  protected readonly choices: ActionChoice[] = [{ value: 'delete', label: 'action.delete', danger: true }];
}
