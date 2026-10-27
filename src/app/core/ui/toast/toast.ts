import { Component, computed, inject, Injectable, signal } from '@angular/core';
import { desktop } from '../../device';
import { VisibleArea } from '../../services/visible-area';

/** A toast: its words, whether it's an error (a red dot before them), and a button on it (e.g. Undo). */
export interface Toast {
  id: number;
  text: string;
  error: boolean;
  action?: { label: string; run: () => void };
}

let nextId = 1;

/**
 * The app's toasts (a few words that come and go — an error, "Deleted · Undo"): `error(text)` or
 * `show(text, action?)`; each goes by itself after a few seconds (an error a little later), or
 * tapped. At most three at a time (the oldest goes). `<ui-toasts />` (app.html) shows them.
 */
@Injectable({ providedIn: 'root' })
export class Toasts {
  readonly list = signal<Toast[]>([]);

  show(text: string, action?: Toast['action']): void {
    this.add({ id: nextId++, text, error: false, action });
  }

  error(text: string): void {
    // (the same error again while it's shown: once)
    if (this.list().some((t) => t.error && t.text === text)) return;
    this.add({ id: nextId++, text, error: true });
  }

  dismiss(id: number): void {
    this.list.update((list) => list.filter((t) => t.id !== id));
  }

  private add(toast: Toast): void {
    this.list.update((list) => [...list, toast].slice(-3));
    setTimeout(() => this.dismiss(toast.id), toast.error ? 5000 : toast.action ? 6000 : 3500);
  }
}

/**
 * Where the toasts show, dark as iOS's / Telegram's (white words, a soft shadow) — phones: a bar as
 * wide as the screen at the bottom (its side margins the floating buttons'), on their line — over
 * them, a little see-through; the words at its left, wrapped (with the keyboard up: just over it);
 * desktops: a card each in the bottom right
 * corner, as wide as the sidebar, its words wrapped; more than fit in 80% of the screen's height:
 * they scroll.
 */
@Component({
  selector: 'ui-toasts',
  host: {
    class:
      'pointer-events-none fixed z-[70] flex flex-col gap-2 ' +
      'mobile:inset-x-0 mobile:items-center mobile:px-4 ' +
      'desktop:right-4 desktop:bottom-4 desktop:max-h-[80vh] desktop:w-nav desktop:overflow-y-auto desktop:p-1',
    '[style.bottom]': 'bottom()',
    'aria-live': 'polite',
  },
  template: `
    @for (toast of toasts.list(); track toast.id) {
      <div
        role="status"
        class="pointer-events-auto flex max-w-full shrink-0 animate-menu-in gap-2.5 bg-toast py-2.5 pr-2 pl-4 text-toast-text shadow-toast backdrop-blur-[20px]
               mobile:min-h-round mobile:w-full mobile:items-center mobile:rounded-[1.375rem] mobile:bg-toast/85 mobile:text-body desktop:items-start desktop:rounded-menu desktop:text-ui"
        [class.pr-4]="!toast.action"
        (click)="toasts.dismiss(toast.id)"
      >
        @if (toast.error) {
          <span class="size-2 shrink-0 rounded-full bg-danger desktop:mt-1.5"></span>
        }
        <span class="min-w-0 flex-1 break-words">{{ toast.text }}</span>
        @if (toast.action; as action) {
          <button type="button" class="shrink-0 rounded-full px-2.5 py-1 font-semibold text-toast-action hover:bg-toast-text/10" (click)="action.run()">
            {{ action.label }}
          </button>
        }
      </div>
    }
  `,
})
export class UiToasts {
  protected readonly toasts = inject(Toasts);
  protected readonly area = inject(VisibleArea);

  // (phones: the floating buttons' line; the keyboard up: over it — what's under the seen part)
  protected readonly bottom = computed(() => {
    if (desktop) return null;
    const keyboard = this.area.keyboard();
    return keyboard
      ? `${window.innerHeight - this.area.top() - this.area.height() + 12}px`
      : 'max(0.75rem, calc(env(safe-area-inset-bottom) - 0.25rem))';
  });
}
