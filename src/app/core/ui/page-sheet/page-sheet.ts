import { EscStack } from '../esc-stack';
import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../i18n/t.pipe';
import { DeviceDetectionService } from '../../services/device-detection.service';
import { LayerStack } from '../../services/layer-stack.service';
import { ActionChoice, ActionSheet, ConfirmDelete } from '../confirm';
import { Icon } from '../icon/icon';
import { ScrollArea } from '../scroll-area/scroll-area';

/**
 * Layout for forms and other screens with inputs:
 * - mobile: full-screen page sliding in from the right, so the keyboard never fights a sheet;
 * - desktop: centered solid dialog, capped to the viewport (`wide`: nearly the whole window,
 *   for reading — e.g. a lesson).
 * Several can be open at once (cards stacked by NavStack): each slides in over the previous.
 *
 * With `actions` (default) it renders the editor chrome:
 * - mobile top bar: back (✕ once `dirty`) · title · ✓ (blue when `canSave`); Delete at the end
 *   of the content when `deletable`;
 * - desktop footer: Delete (when `deletable`) · Save (a click outside closes). Delete asks to
 *   confirm first.
 * Without `actions`, round buttons marked `barEnd` go to the right of the mobile top bar:
 *   <button barEnd class="icon-btn">…</button> (several, or inside @if: <ng-container ngProjectAs="[barEnd]">)
 * Menus without inputs use <app-sheet> instead.
 * Render it with @if; call close() to animate out, then `closed` fires.
 */
@Component({
  selector: 'app-page-sheet',
  imports: [ActionSheet, ConfirmDelete, Icon, NgTemplateOutlet, ScrollArea, TranslatePipe],
  template: `
    <div
      class="fixed inset-0 z-30 desktop:flex desktop:items-center desktop:justify-center desktop:p-4"
      [class.desktop:!p-2]="wide()"
      [class.!relative]="inline()"
      [class.!z-auto]="inline()"
      [class.desktop:!block]="inline()"
      [class.desktop:!p-0]="inline()"
      [class.h-full]="inline()"
      (click)="back(null)"
    >
      <div
        class="relative flex h-full w-full flex-col text-[var(--text)] [animation:pageInRight_360ms_var(--ease-out-quick)] mobile:bg-[var(--app-bg)] desktop:h-auto desktop:max-h-[calc(var(--app-h,100dvh)-2rem)] desktop:max-w-md desktop:p-4"
        [class.dialog-panel]="desktop && !inline()"
        [class.!animate-none]="inline()"
        [class.desktop:!mx-auto]="inline()"
        [class.desktop:!max-w-none]="inline()"
        [class.desktop:!h-full]="inline()"
        [class.desktop:!max-h-none]="inline()"

        [class.desktop:!h-full]="wide()"
        [class.desktop:!max-h-none]="wide()"
        [class.desktop:!max-w-none]="wide()"
        [class.desktop:!max-w-3xl]="large()"
        [class.desktop:!w-fit]="fit()"
        [class.desktop:!min-w-80]="fit()"
        [class.desktop:!max-w-[85vw]]="fit()"
        [class.desktop:!max-h-[85vh]]="fit()"
        [class.desktop:!px-1]="bleed()"
        [class.desktop:!max-w-[45rem]]="doc() && !inline()"
        [class.desktop:!max-h-[85vh]]="doc() && !inline()"
        [class.desktop:!rounded-xl]="doc() && !inline()"
        [class.desktop:!pt-3]="doc()"
        [style.transform]="closing() ? 'translateX(100%)' : null"
        [style.transition]="closing() ? 'transform 240ms var(--ease-out-quick)' : null"
        (click)="$event.stopPropagation()"
      >
        <!-- (desktop: nothing dims — not the page under it, not it under what opens over it) -->
        <!-- Mobile top bar: same side inset as the cards, round controls. It floats over the
             content (which scrolls under it), fading from the page color to transparent; only
             its buttons take taps. -->
        <div class="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-[linear-gradient(to_bottom,var(--app-bg)_40%,transparent)] px-4 pb-5 pt-[calc(env(safe-area-inset-top)+0.5rem)] desktop:hidden [&_button]:pointer-events-auto">
          <button
            type="button"
            (click)="back($event.currentTarget)"
            [attr.aria-label]="(dirty() ? 'action.discard' : closeIcon() ? 'action.done' : 'action.back') | t"
            class="icon-btn relative"
          >
            @if (dirty() || closeIcon()) {
              <app-icon name="close" class="size-6" />
            } @else {
              <app-icon name="chevron-left" class="-ml-0.5 size-7" />
            }
          </button>
          <span class="text-body pointer-events-none absolute inset-x-0 truncate px-[6.5rem] text-center font-semibold" [class.big-title]="bigTitle()">{{ title() }}</span>
          @if (actions()) {
            <button
              type="button"
              (click)="onSave($event)"
              [disabled]="!canSave()"
              [attr.aria-label]="'action.save' | t"
              class="relative ml-auto"
              [class.btn-confirm]="canSave()"
              [class.icon-btn]="!canSave()"
              [class.opacity-40]="!canSave()"
            >
              <app-icon name="check" [strokeWidth]="2" class="size-7" />
            </button>
          } @else {
            <div class="relative ml-auto flex items-center gap-2"><ng-content select="[barEnd]" /></div>
          }
        </div>

        <ng-template #body>
          <ng-content />
          @if (actions() && deletable()) {
            <button type="button" (click)="onDelete($event)" class="card-btn mt-6 text-[var(--danger)] desktop:hidden">
              {{ 'action.delete' | t }}
            </button>
          }
        </ng-template>
        @if (scroll()) {
          <app-scroll-area
            class="min-h-0 flex-1 px-4 desktop:flex-initial desktop:px-0"
            [contentClass]="'pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+4.25rem)] desktop:pb-0 desktop:pt-0' + (bleed() ? ' desktop:px-3' : '')"
          >
            <ng-container [ngTemplateOutlet]="body" />
          </app-scroll-area>
        } @else {
          <div class="flex min-h-0 flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+4.25rem)] desktop:px-0 desktop:pb-0 desktop:pt-0" [class.desktop:!px-3]="bleed()">
            <ng-container [ngTemplateOutlet]="body" />
          </div>
        }

        @if (actions()) {
          <!-- Desktop footer -->
          <!-- (in the new style: Delete and Save as head buttons; Delete orange on hover) -->
          <div class="mt-4 flex items-center gap-2 mobile:hidden" [class.px-3]="bleed()">
            @if (deletable()) {
              <button type="button" (click)="onDelete($event)" class="head-btn hover:!text-[var(--brand-orange,#f97316)]"><app-icon name="trash" />{{ 'action.delete' | t }}</button>
            }
            <!-- No Cancel: a click outside the card closes it -->
            <button type="button" (click)="onSave($event)" [disabled]="!canSave()" class="head-btn ml-auto font-semibold disabled:opacity-30"><app-icon name="check" />{{ 'action.save' | t }}</button>
          </div>
        }
      </div>
    </div>

    <!-- Delete asks first -->
    @if (askDelete()) {
      <app-confirm-delete [origin]="actionOrigin()" (confirmed)="delete.emit()" (closed)="askDelete.set(false)" />
    }

    <!-- Leaving with unsaved changes asks first (iOS: "Discard Changes") -->
    @if (askDiscard()) {
      <app-action-sheet
        title="confirm.discardTitle"
        [choices]="discardChoices"
        [origin]="discardOrigin()"
        (chosen)="leave()"
        (closed)="askDiscard.set(false)"
      />
    }
  `,
})
export class PageSheet {
  readonly title = input('');
  // A larger top bar title (a person's name).
  readonly bigTitle = input(false);
  readonly actions = input(true); // editor chrome (✓ / Save / Delete); false for pickers
  // The body scrolls as a whole (app-scroll-area); false when the content pins parts (a search)
  // and scrolls its own list.
  readonly scroll = input(true);
  readonly dirty = input(false);
  // Phones: ✕ instead of ‹ (a card over the page rather than a step in — e.g. a lesson opened
  // from a notification)
  readonly closeIcon = input(false);
  // Phones too: the cursor in the first field once it's in (e.g. a new student's name)
  readonly autofocus = input(false);
  readonly canSave = input(false);
  readonly deletable = input(false);
  readonly wide = input(false);
  // Desktop: the window behind darkened (false: left as it is — e.g. a student's answers over
  // the lesson, which stays readable)
  readonly dim = input(true);
  /** Desktop: a page of its own (in the page, not floating over it; Esc doesn't close it). */
  readonly inline = input(false);
  // Desktop: a wider dialog (room for two columns, e.g. a student's details and events).
  readonly large = input(false);
  /** Desktop: as big as its content, up to 85% of the window either way (then it scrolls). */
  readonly fit = input(false);
  /** Desktop: rows' tints may reach 12 px past the content's sides (its side padding moved inside the
   * scrolling, which would cut them off). */
  readonly bleed = input(false);
  /** Desktop: a page's popup, as the peek's (720 wide, up to 85% tall; its head as the pages'). */
  readonly doc = input(false);
  // false: back / ✕ / Cancel / a click outside emit `cancel` and leave the page open (e.g. a
  // card that leaves its edit mode instead of closing).
  readonly cancelCloses = input(true);
  // false: Delete emits `delete` right away (the card asks its own question, e.g. for a series).
  readonly confirmDelete = input(true);

  readonly save = output<void>();
  readonly delete = output<void>();
  readonly closed = output<void>();
  readonly cancel = output<void>();

  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly closing = signal(false);
  protected readonly askDelete = signal(false);
  protected readonly askDiscard = signal(false);
  protected readonly discardOrigin = signal<HTMLElement | null>(null);
  protected readonly discardChoices: ActionChoice[] = [{ value: 'discard', label: 'confirm.discardChanges', danger: true }];

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  private readonly layers = inject(LayerStack);
  private readonly layer = this.layers.add(true);
  protected readonly covered = this.layers.covered(this.layer);
  protected readonly overPage = this.layers.overPage(this.layer); // the page is already dimmed

  constructor() {
    // (Esc: as its back / ✕ — asking first about unsaved changes)
    const offEsc = inject(EscStack).push(() => this.back(null));
    inject(DestroyRef).onDestroy(offEsc);
    // (a page of its own: no Esc, not a layer over the page)
    afterNextRender(() => {
      if (!this.inline()) return;
      offEsc();
      this.layers.remove(this.layer);
    });
    // Over the whole window wherever it's declared: moved to <body>, so no ancestor (a scroll
    // area's mask / isolate, a transform) turns `fixed` into "inside that box" — e.g. a
    // student's answers opened from within a lesson's column
    const el = this.host.nativeElement;
    afterNextRender(() => {
      if (!this.inline()) document.body.appendChild(el);
    });
    inject(DestroyRef).onDestroy(() => {
      this.layers.remove(this.layer);
      el.remove();
    });
    // Desktop editors (with actions) start with the cursor in their first field, once they've
    // slid in (on phones only with `autofocus` — the keyboard covers part of the card; the tap that
    // opened it has to bring the keyboard up, see primeKeyboard).
    afterNextRender(() => {
      if (!this.actions() || (!this.desktop && !this.autofocus())) return;
      setTimeout(() => {
        const field = this.host.nativeElement.querySelector<HTMLElement>(
          '.read-only, input:not([type=hidden]):not([type=checkbox]):not([disabled]), textarea:not([disabled])',
        );
        if (field && !field.classList.contains('read-only')) field.focus({ preventScroll: true });
      }, 380);
    });

    // Keep the page pinned: iOS scrolls the document to reveal a focused field even with
    // overflow hidden — snap it back so the sheet never shifts.
    const pin = () => {
      if (window.scrollY || window.scrollX) window.scrollTo(0, 0);
    };
    window.addEventListener('scroll', pin);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('scroll', pin));
  }

  /** The Save / Delete button last pressed (questions about it open next to it). */
  readonly actionOrigin = signal<HTMLElement | null>(null);

  protected onSave(e: Event): void {
    this.actionOrigin.set(e.currentTarget as HTMLElement);
    this.save.emit();
  }

  protected onDelete(e: Event): void {
    this.actionOrigin.set(e.currentTarget as HTMLElement);
    if (this.confirmDelete()) this.askDelete.set(true);
    else this.delete.emit();
  }

  // back / ✕ / a click outside: with unsaved changes, asks before throwing them away.
  protected back(origin: EventTarget | null): void {
    if (this.closing() || this.askDiscard()) return;
    if (this.dirty()) {
      this.discardOrigin.set(origin as HTMLElement | null);
      this.askDiscard.set(true);
    } else this.leave();
  }

  protected leave(): void {
    if (this.cancelCloses()) this.close();
    else this.cancel.emit();
  }

  close(): void {
    if (this.closing()) return;
    this.closing.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }
}
