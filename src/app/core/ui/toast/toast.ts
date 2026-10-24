import { Component, inject, Injectable, signal } from '@angular/core';
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
 * Where the toasts show: a capsule each, the dialogs' color and shadow — phones: at the top, under
 * the top bar (on the part of the screen that's seen); desktops: at the bottom, in the middle.
 */
@Component({
  selector: 'ui-toasts',
  host: {
    class: 'pointer-events-none fixed inset-x-0 z-[70] flex flex-col items-center gap-2 px-4',
    '[style.top]': "desktop ? null : 'calc(' + area.top() + 'px + env(safe-area-inset-top) + 3.75rem)'",
    '[style.bottom.px]': 'desktop ? 24 : null',
    'aria-live': 'polite',
  },
  template: `
    @for (toast of toasts.list(); track toast.id) {
      <div
        role="status"
        class="pointer-events-auto flex max-w-full animate-menu-in items-center gap-2.5 rounded-full bg-dialog py-2.5 pr-2 pl-4 text-fg shadow-popover mobile:text-body desktop:text-ui"
        [class.pr-4]="!toast.action"
        (click)="toasts.dismiss(toast.id)"
      >
        @if (toast.error) {
          <span class="size-2 shrink-0 rounded-full bg-danger"></span>
        }
        <span class="min-w-0">{{ toast.text }}</span>
        @if (toast.action; as action) {
          <button type="button" class="shrink-0 rounded-full px-2.5 py-1 font-medium text-accent hover:bg-tint" (click)="action.run()">
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
  protected readonly desktop = desktop;
}
