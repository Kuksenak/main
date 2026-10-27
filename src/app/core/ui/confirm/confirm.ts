import {
  ApplicationRef,
  Component,
  ElementRef,
  EnvironmentInjector,
  Injectable,
  computed,
  createComponent,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { desktop } from '../../device';
import { TranslatePipe } from '../../i18n/t.pipe';
import { UiButton } from '../button/button';

/** What's asked: the question ("Delete … forever? It can't be undone."), the answer that does it. */
export interface ConfirmAsk {
  text: string;
  yes: string;
  /** (the answer in the danger color: a delete) */
  danger?: boolean;
}

/**
 * A question before something that can't be undone (Delete forever, Empty trash): `ask(button, {…})`
 * — true when it's answered yes. Right by the button that asked, no dimming (as the old app's):
 * phones: a glass panel, the question in gray, the answer a big round button (a tap outside: no);
 * desktops: a small card — the question, Cancel and the answer at its right (Esc, a click outside: no).
 */
@Injectable({ providedIn: 'root' })
export class Confirm {
  private readonly app = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);

  ask(origin: HTMLElement | null, ask: ConfirmAsk): Promise<boolean> {
    return new Promise((done) => {
      const ref = createComponent(UiConfirm, { environmentInjector: this.injector });
      ref.setInput('origin', origin);
      ref.setInput('ask', ask);
      ref.instance.answered.subscribe((yes) => {
        done(yes);
        this.app.detachView(ref.hostView);
        ref.destroy();
      });
      this.app.attachView(ref.hostView);
      document.body.appendChild(ref.location.nativeElement);
    });
  }
}

@Component({
  selector: 'ui-confirm',
  imports: [TranslatePipe, UiButton],
  // (in the browser's top layer, as the menus are — over a menu or a sheet that asked)
  host: {
    popover: 'manual',
    class: 'fixed inset-0 m-0 size-full max-h-none max-w-none overflow-visible border-0 bg-transparent p-0',
    '(click)': 'answer(false)',
  },
  templateUrl: './confirm.html',
})
export class UiConfirm {
  readonly origin = input<HTMLElement | null>(null);
  readonly ask = input.required<ConfirmAsk>();
  readonly answered = output<boolean>();

  protected readonly desktop = desktop;
  private readonly el: HTMLElement = inject(ElementRef).nativeElement;
  private done = false;

  // Where it goes: by the button that asked, centred on it — under it in the screen's upper half,
  // over it lower down (no button: the middle of the screen)
  protected readonly place = computed(() => {
    const el = this.origin();
    const width = desktop ? 288 : 256;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!el) return { top: vh / 2 - 80, bottom: null, left: (vw - width) / 2 };
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left + r.width / 2 - width / 2, vw - 8 - width));
    return r.top > vh / 2 ? { top: null, bottom: vh - r.top + 6, left } : { top: r.bottom + 6, bottom: null, left };
  });

  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    // (Esc: only this — not the menu under it too)
    e.stopPropagation();
    e.preventDefault();
    this.answer(false);
  };

  constructor() {
    queueMicrotask(() => this.el.isConnected && this.el.showPopover());
    document.addEventListener('keydown', this.onKey, true);
  }

  protected answer(yes: boolean): void {
    if (this.done) return;
    this.done = true;
    document.removeEventListener('keydown', this.onKey, true);
    this.answered.emit(yes);
  }
}
