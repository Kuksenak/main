import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DeviceDetectionService } from '../services/device-detection.service';
import { TranslatePipe } from '../i18n/t.pipe';
import { TranslationKey } from '../i18n/translations';

export interface ActionChoice {
  value: string;
  label: TranslationKey;
  danger?: boolean;
}

/**
 * A question with a few answers, next to the button that asked (no dimming — on mobile it would
 * tint the toolbar). Mobile: the answers as big centered buttons. Desktop: a small dialog with
 * the answers as regular buttons. A click outside cancels. Render it with @if; `chosen` fires with the answer's value, `closed`
 * once it's gone either way.
 */
@Component({
  selector: 'app-action-sheet',
  imports: [TranslatePipe],
  template: `
    <div
      class="fixed inset-0 z-50 flex transition-opacity duration-200 [animation:fadeIn_200ms_ease-out]"
      [class.opacity-0]="closing()"
      (click)="close()"
    >
      @if (desktop) {
        <!-- Desktop: a small dialog by the button — the text, then the answers as regular buttons
             across its width (no Cancel: a click outside cancels) -->
        <div
          role="alertdialog"
          class="fixed flex w-80 flex-col gap-3 rounded-xl border-[0.5px] border-[var(--separator)] bg-[var(--dialog-bg)] p-4 text-[var(--text)] shadow-[var(--shadow-dialog)] transition-[opacity,scale] duration-200 [animation:dropdownIn_160ms_var(--ease-out-quick)]"
          [style.top.px]="place().top"
          [style.bottom.px]="place().bottom"
          [style.right.px]="place().right"
          [class.scale-95]="closing()"
          (click)="$event.stopPropagation()"
        >
          <!-- Just the explanation when there is one ("This can't be undone"), else the question -->
          <p class="text-body text-center">{{ (message() ?? title()) | t }}</p>
          <!-- The answers across the full width, labels centered; a click outside cancels -->
          <div class="grid gap-2">
            @for (c of choices(); track c.value) {
              <button
                type="button"
                (click)="choose(c.value)"
                [class]="c.danger ? 'btn-danger' : 'btn-secondary'"
              >{{ c.label | t }}</button>
            }
          </div>
        </div>
      } @else {
        <!-- Mobile: a small panel right by the button that asked (above it when it's low on the
             screen): the question, then each answer as a centered button; a tap outside cancels -->
        <div
          role="alertdialog"
          class="fixed flex w-72 flex-col gap-1.5 rounded-2xl border-[0.5px] border-[var(--separator)] bg-[var(--dialog-bg)] p-2 text-[var(--text)] shadow-[0_8px_30px_rgb(0_0_0/0.18)] transition-[opacity,scale] duration-200 [animation:dropdownIn_200ms_var(--ease-out-quick)]"
          [style.top.px]="place().top"
          [style.bottom.px]="place().bottom"
          [style.right.px]="place().right"
          [class.origin-bottom-right]="place().bottom !== null"
          [class.origin-top-right]="place().top !== null"
          [class.scale-95]="closing()"
          (click)="$event.stopPropagation()"
        >
          <p class="text-body px-2 pb-1 pt-1.5 text-center opacity-60">{{ (message() ?? title()) | t }}</p>
          @for (c of choices(); track c.value) {
            <button
              type="button"
              (click)="choose(c.value)"
              class="h-12 rounded-xl bg-[var(--fill)] text-center text-[1.125rem] font-medium active:opacity-70 active:![transform:none]"
              [class.text-[var(--danger)]]="c.danger"
            >{{ c.label | t }}</button>
          }
        </div>
      }
    </div>
  `,
})
export class ActionSheet {
  readonly title = input.required<TranslationKey>();
  readonly message = input<TranslationKey | null>(null);
  readonly choices = input.required<ActionChoice[]>();
  /** Mobile: the button that asked — the menu opens next to it (else at the bottom right). */
  readonly origin = input<HTMLElement | null>(null);
  readonly chosen = output<string>();
  readonly closed = output<void>();

  protected readonly closing = signal(false);
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();

  // Where the mobile menu goes: right-aligned with the button, below it when it's in the upper
  // half of the screen, above it otherwise.
  protected readonly place = computed(() => {
    const el = this.origin();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!el) return { top: null, bottom: 16, right: 16 };
    const r = el.getBoundingClientRect();
    const width = this.desktop ? 320 : 288;
    const right = Math.max(8, Math.min(vw - r.right, vw - 8 - width));
    return r.top > vh / 2
      ? { top: null, bottom: vh - r.top + 8, right }
      : { top: r.bottom + 8, bottom: null, right };
  });

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

/** "Delete? This can't be undone." — Yes, delete (see ActionSheet). */
@Component({
  selector: 'app-confirm-delete',
  imports: [ActionSheet],
  template: `
    <app-action-sheet
      title="confirm.deleteTitle"
      message="confirm.deleteText"
      [choices]="choices"
      [origin]="origin()"
      (chosen)="confirmed.emit()"
      (closed)="closed.emit()"
    />
  `,
})
export class ConfirmDelete {
  readonly origin = input<HTMLElement | null>(null);
  readonly confirmed = output<void>();
  readonly closed = output<void>();

  // "Yes, delete": the button that asked already says Delete.
  protected readonly choices: ActionChoice[] = [{ value: 'delete', label: 'confirm.yesDelete', danger: true }];
}
