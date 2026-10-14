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

/** The notes, at the bottom right: small, solid, a hairline and a soft shadow. */
@Component({
  selector: 'app-toasts',
  imports: [Icon, TranslatePipe],
  template: `
    <div class="pointer-events-none fixed bottom-4 right-4 z-[2600] flex flex-col items-end gap-2">
      @for (t of service.toasts(); track t.id) {
        <div class="pointer-events-auto flex items-center gap-2 rounded-lg border-[0.5px] border-[var(--separator)] bg-[var(--dialog-bg)] py-2 pl-3 pr-3 text-[0.8125rem] font-[450] text-[var(--text)] shadow-[0_6px_20px_rgb(0_0_0/0.12)] [animation:dropdownIn_180ms_var(--ease-out-quick)]">
          <app-icon [name]="t.icon" class="size-4 shrink-0 opacity-70" />
          <span>{{ t.text | t }}</span>
          @if (t.action; as a) {
            <button type="button" (click)="a.run(); service.dismiss(t.id)" class="-my-1 ml-1 rounded-md px-1.5 py-0.5 font-semibold hover:bg-[var(--tint)]">{{ a.label | t }}</button>
          }
        </div>
      }
    </div>
  `,
})
export class Toasts {
  protected readonly service = inject(ToastService);
}
