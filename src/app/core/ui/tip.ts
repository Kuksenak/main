import { Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';

/**
 * A hover hint (a small dark label beside the element), the app's own instead of the browser's
 * title: `appTip="Text"` (`**words**` in it stand out, the rest faded), `tipSide` where it shows (left / top / right / bottom; flipped when there's
 * no room). Shown after a short pause on hover; gone on leaving, a press or scrolling. Not on touch
 * screens.
 */
@Directive({
  selector: '[appTip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    '(mousedown)': 'hide()',
    '(focusout)': 'hide()',
  },
})
export class Tip implements OnDestroy {
  readonly appTip = input<string | null | undefined>(null);
  readonly tipSide = input<'left' | 'top' | 'right' | 'bottom'>('top');

  private readonly el: HTMLElement = inject(ElementRef).nativeElement;
  private tip: HTMLElement | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly onScroll = () => this.hide();

  protected show(): void {
    const text = this.appTip();
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
    tip.className = 'tip';
    tip.setAttribute('role', 'tooltip');
    // (**words** stand out, the rest faded — "**Drag** to move")
    if (text.includes('**')) {
      text.split(/(\*\*[^*]+\*\*)/).forEach((part) => {
        if (!part) return;
        const span = document.createElement('span');
        const strong = part.startsWith('**') && part.endsWith('**');
        span.textContent = strong ? part.slice(2, -2) : part;
        if (!strong) span.className = 'tip-dim';
        tip.appendChild(span);
      });
    } else tip.textContent = text;
    document.body.appendChild(tip);
    const r = this.el.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const gap = 8;
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
    tip.dataset['side'] = side;
    this.tip = tip;
    window.addEventListener('scroll', this.onScroll, true);
  }

  ngOnDestroy(): void {
    this.hide();
  }
}
