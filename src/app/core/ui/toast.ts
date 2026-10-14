import { Component, Injectable, inject, signal } from '@angular/core';
import { TranslatePipe } from '../i18n/t.pipe';
import { TranslationKey } from '../i18n/translations';
import { Icon, IconName } from './icon/icon';

export interface Toast {
  id: number;
  text: TranslationKey;
  icon: IconName;
  /** A button on it (e.g. Undo), then it goes. */
  action?: { label: TranslationKey; run: () => void };
}

/** Small notes in the corner ("Saved", "Moved to trash · Undo"), each gone after a few seconds. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private next = 0;

  show(text: TranslationKey, opts: { icon?: IconName; action?: Toast['action'] } = {}): void {
    const id = ++this.next;
    // (one note per text at a time: a second "Saved" replaces the first)
    this.toasts.update((list) => [...list.filter((t) => t.text !== text), { id, text, icon: opts.icon ?? 'check', action: opts.action }].slice(-3));
    setTimeout(() => this.dismiss(id), opts.action ? 5000 : 2500);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}

/** The notes, at the bottom right: dark (light in the dark theme), Undo as a button on it. */
@Component({
  selector: 'app-toasts',
  imports: [Icon, TranslatePipe],
  template: `
    <div class="pointer-events-none fixed bottom-4 right-4 z-[2600] flex flex-col items-end gap-2">
      @for (t of service.toasts(); track t.id) {
        <!-- (dark on the light page and light on the dark one: clear at a glance) -->
        <div class="pointer-events-auto flex min-h-11 items-center gap-2.5 rounded-xl bg-[color-mix(in_srgb,var(--text)_92%,var(--app-bg))] py-2.5 pl-4 pr-4 text-[0.875rem] font-medium text-[var(--app-bg)] shadow-[0_8px_24px_rgb(0_0_0/0.2)] [animation:dropdownIn_180ms_var(--ease-out-quick)]" [class.!pr-2]="!!t.action">
          <app-icon [name]="t.icon" class="size-[1.125rem] shrink-0 opacity-80" />
          <span>{{ t.text | t }}</span>
          @if (t.action; as a) {
            <button type="button" (click)="a.run(); service.dismiss(t.id)" class="ml-2 rounded-lg bg-[color-mix(in_srgb,var(--app-bg)_16%,transparent)] px-3 py-1 font-semibold hover:bg-[color-mix(in_srgb,var(--app-bg)_26%,transparent)]">{{ a.label | t }}</button>
          }
        </div>
      }
    </div>
  `,
})
export class Toasts {
  protected readonly service = inject(ToastService);
}
