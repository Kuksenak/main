import { Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';

/**
 * A hover hint, as Notion's (desktops; not the browser's title): a small dark label by the
 * element — `uiTip="Drag to move"`, all in one color; a line break (\n): a new line. `tipSide`: where it shows (flipped when there's no room). Shown after a short pause on
 * hover; gone on leaving, a press or scrolling. Not on touch screens.
 */
@Directive({
  selector: '[uiTip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(mousedown)': 'hide()',
    '(focusout)': 'hide()',
  },
})
export class UiTip implements OnDestroy {
  readonly uiTip = input<string | null | undefined>(null);
  readonly tipSide = input<'left' | 'top' | 'right' | 'bottom'>('bottom');

  private readonly el: HTMLElement = inject(ElementRef).nativeElement;
  private tip: HTMLElement | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly onScroll = () => this.hide();

  protected show(): void {
    const text = this.uiTip();
    if (!text || matchMedia('(hover: none)').matches) return;
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
      'pointer-events-none fixed z-[3000] max-w-60 animate-menu-in rounded-button bg-toast px-2 py-1 text-center text-tip leading-snug font-medium text-toast-text shadow-toast';
    tip.setAttribute('role', 'tooltip');
    // (one color; a line break: a new line)
    text.split('\n').forEach((line) => {
      const row = document.createElement('div');
      row.textContent = line;
      tip.appendChild(row);
    });
    document.body.appendChild(tip);
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
    this.hide();
  }
}
