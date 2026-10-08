import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../i18n/t.pipe';
import { DeviceDetectionService } from '../../services/device-detection.service';
import { Icon } from '../icon/icon';
import { ScrollArea } from '../scroll-area/scroll-area';

/**
 * Layout for forms and other screens with inputs:
 * - mobile: full-screen page sliding in from the right, so the keyboard never fights a sheet;
 * - desktop: centered solid dialog, capped to the viewport.
 * Several can be open at once (cards stacked by NavStack): each slides in over the previous.
 *
 * With `actions` (default) it renders the editor chrome:
 * - mobile top bar: back (✕ once `dirty`) · title · ✓ (blue when `canSave`); Delete at the end
 *   of the content when `deletable`;
 * - desktop footer: Delete (when `deletable`) · Cancel · Save.
 * Menus without inputs use <app-sheet> instead.
 * Render it with @if; call close() to animate out, then `closed` fires.
 */
@Component({
  selector: 'app-page-sheet',
  imports: [Icon, NgTemplateOutlet, ScrollArea, TranslatePipe],
  template: `
    <div
      class="fixed inset-0 z-30 desktop:flex desktop:items-center desktop:justify-center desktop:bg-[var(--backdrop)] desktop:p-4"
      (click)="close()"
    >
      <div
        class="flex h-full w-full flex-col text-[var(--text)] [animation:pageInRight_360ms_var(--ease-out-quick)] mobile:bg-[var(--app-bg)] desktop:h-auto desktop:max-h-[calc(100dvh-2rem)] desktop:max-w-md desktop:p-4"
        [class.dialog-panel]="desktop"
        [style.transform]="closing() ? 'translateX(100%)' : null"
        [style.transition]="closing() ? 'transform 240ms var(--ease-out-quick)' : null"
        (click)="$event.stopPropagation()"
      >
        <!-- Mobile top bar: same side inset as the cards, round controls -->
        <div class="relative flex shrink-0 items-center gap-2 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] desktop:hidden">
          <button
            type="button"
            (click)="close()"
            [attr.aria-label]="(dirty() ? 'action.discard' : 'action.back') | t"
            class="icon-btn relative"
          >
            @if (dirty()) {
              <app-icon name="close" class="size-6" />
            } @else {
              <app-icon name="chevron-left" class="-ml-0.5 size-7" />
            }
          </button>
          <span class="text-body pointer-events-none absolute inset-x-0 text-center font-semibold">{{ title() }}</span>
          @if (actions()) {
            <button
              type="button"
              (click)="save.emit()"
              [disabled]="!canSave()"
              [attr.aria-label]="'action.save' | t"
              class="relative ml-auto"
              [class.btn-confirm]="canSave()"
              [class.icon-btn]="!canSave()"
              [class.opacity-40]="!canSave()"
            >
              <app-icon name="check" [strokeWidth]="2" class="size-7" />
            </button>
          }
        </div>

        <ng-template #body>
          <ng-content />
          @if (actions() && deletable()) {
            <button type="button" (click)="delete.emit()" class="card-btn mt-6 text-[var(--danger)] desktop:hidden">
              {{ 'action.delete' | t }}
            </button>
          }
        </ng-template>
        @if (scroll()) {
          <app-scroll-area
            class="min-h-0 flex-1 px-4 desktop:flex-initial desktop:px-0"
            contentClass="pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-1 desktop:pb-0 desktop:pt-0"
          >
            <ng-container [ngTemplateOutlet]="body" />
          </app-scroll-area>
        } @else {
          <div class="flex min-h-0 flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-1 desktop:px-0 desktop:pb-0 desktop:pt-0">
            <ng-container [ngTemplateOutlet]="body" />
          </div>
        }

        @if (actions()) {
          <!-- Desktop footer -->
          <div class="mt-4 flex items-center gap-2 mobile:hidden">
            @if (deletable()) {
              <button type="button" (click)="delete.emit()" class="btn-secondary !text-[var(--danger)]">{{ 'action.delete' | t }}</button>
            }
            <button type="button" (click)="close()" class="btn-secondary ml-auto">{{ 'action.cancel' | t }}</button>
            <button type="button" (click)="save.emit()" [disabled]="!canSave()" class="btn-primary">{{ 'action.save' | t }}</button>
          </div>
        }
      </div>
    </div>
  `,
})
export class PageSheet {
  readonly title = input('');
  readonly actions = input(true); // editor chrome (✓ / Save / Delete); false for pickers
  // The body scrolls as a whole (app-scroll-area); false when the content pins parts (a search)
  // and scrolls its own list.
  readonly scroll = input(true);
  readonly dirty = input(false);
  readonly canSave = input(false);
  readonly deletable = input(false);

  readonly save = output<void>();
  readonly delete = output<void>();
  readonly closed = output<void>();

  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly closing = signal(false);

  constructor() {
    // Keep the page pinned: iOS scrolls the document to reveal a focused field even with
    // overflow hidden — snap it back so the sheet never shifts.
    const pin = () => {
      if (window.scrollY || window.scrollX) window.scrollTo(0, 0);
    };
    window.addEventListener('scroll', pin);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('scroll', pin));
  }

  close(): void {
    if (this.closing()) return;
    this.closing.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }
}
