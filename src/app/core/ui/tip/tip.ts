import { booleanAttribute, Directive, effect, ElementRef, OnDestroy, inject, input } from '@angular/core';

/**
 * A hover hint, as Notion's (desktops; not the browser's title): a small dark label by the
 * element — `uiTip="Drag to move"`, all in one color; a line break (\n): a new line. `tipSide`: where it shows (flipped when there's no room). Shown after a short pause on
 * hover; gone on leaving, a press (a click, a drag's start, a key — the capture phase: before the
 * element's own handlers, even ones that stop it), scrolling, or its text taken away; after a press,
 * not again till the pointer has left and come back. Not on touch screens. `tipIfCut`: only when the
 * element's text doesn't fit (ends in …) — the hint is then the whole of it.
 */
@Directive({
  selector: '[uiTip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'pressed = false; hide()',
    '(focusout)': 'hide()',
  },
})
export class UiTip implements OnDestroy {
  readonly uiTip = input<string | null | undefined>(null);
  readonly tipSide = input<'left' | 'top' | 'right' | 'bottom'>('bottom');
  readonly tipIfCut = input(false, { transform: booleanAttribute });

  private readonly el: HTMLElement = inject(ElementRef).nativeElement;
  private tip: HTMLElement | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly onScroll = () => this.hide();
  // (pressed since the pointer came: no hint till it leaves)
  protected pressed = false;
  private readonly onPress = () => {
    this.pressed = true;
    this.hide();
  };

  constructor() {
    for (const type of ['pointerdown', 'mousedown', 'dragstart', 'keydown'] as const) this.el.addEventListener(type, this.onPress, true);
    // (its text taken away — e.g. its menu opened: the hint gone too)
    effect(() => {
      if (!this.uiTip()) this.hide();
    });
  }

  protected show(): void {
    const text = this.uiTip();
    if (!text || this.pressed || matchMedia('(hover: none)').matches) return;
    // (all of it shown: no need)
    if (this.tipIfCut() && ![this.el, ...this.el.querySelectorAll('*')].some((e) => e.scrollWidth > e.clientWidth)) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.open(text), 350);
  }

  protected hide(): void {
    clearTimeout(this.timer);
    this.tip?.remove();
    this.tip = null;
    window.removeEventListener('scroll', this.onScroll, true);
  }

  private open(text: string): void {
    this.hide();
    if (!this.el.isConnected) return;
    const tip = document.createElement('div');
    tip.className =
      'pointer-events-none fixed z-[3000] max-w-60 animate-menu-in rounded-button bg-toast px-2 py-1 text-center text-tip leading-snug font-normal text-toast-text shadow-toast';
    tip.setAttribute('role', 'tooltip');
    // (one color; a line break: a new line)
    text.split('\n').forEach((line) => {
      const row = document.createElement('div');
      row.textContent = line;
      tip.appendChild(row);
    });
    // (in the browser's top layer, as the menus are — CDK's overlays are popovers: a z-index alone left
    // the hint under them)
    tip.popover = 'manual';
    tip.style.margin = '0';
    tip.style.inset = 'auto';
    tip.style.border = '0';
    tip.style.overflow = 'visible';
    document.body.appendChild(tip);
    tip.showPopover();
    const r = this.el.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const gap = 6;
    const fits = {
      left: r.left - t.width - gap >= 4,
      right: r.right + t.width + gap <= window.innerWidth - 4,
      top: r.top - t.height - gap >= 4,
      bottom: r.bottom + t.height + gap <= window.innerHeight - 4,
    };
    const flip = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' } as const;
    const side = fits[this.tipSide()] ? this.tipSide() : flip[this.tipSide()];
    let x = side === 'left' ? r.left - t.width - gap : side === 'right' ? r.right + gap : r.left + r.width / 2 - t.width / 2;
    let y = side === 'top' ? r.top - t.height - gap : side === 'bottom' ? r.bottom + gap : r.top + r.height / 2 - t.height / 2;
    x = Math.max(4, Math.min(x, window.innerWidth - t.width - 4));
    y = Math.max(4, Math.min(y, window.innerHeight - t.height - 4));
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
    this.tip = tip;
    window.addEventListener('scroll', this.onScroll, true);
  }

  ngOnDestroy(): void {
    for (const type of ['pointerdown', 'mousedown', 'dragstart', 'keydown'] as const) this.el.removeEventListener(type, this.onPress, true);
    this.hide();
  }
}
