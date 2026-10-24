import { ApplicationRef, inject, Injectable } from '@angular/core';

/** Which way a move goes: deeper (the new one in from the right) or back (from the left). */
export type SlideWay = 'forward' | 'back';

/** What moves: the page (the router's: the page, its title, ‹) or a sheet's pane (its ‹, name, what's in it). */
export type SlideScope = 'route' | 'sheet';

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/**
 * Moving between views as iOS does: the new one slides in — forward from the right edge, back from
 * a little to the left — inside the box it's in (the sheet, the page: they clip it), the old one
 * gone at once (so never one over the other). What moves is marked in the markup:
 * `data-vt="page" | "page-title" | "page-back"` (the router's moves, MobileLayout) and
 * `data-vt="sheet-pane" | "sheet-title" | "sheet-back"` (`run`: a sheet's). The titles and ‹ only
 * a little, fading in. Plain animations (Web Animations): View Transitions' pictures of the page
 * lost iOS's blur under a sheet. Set to reduce motion: no slide.
 */
@Injectable({ providedIn: 'root' })
export class Slide {
  private readonly app = inject(ApplicationRef);

  /** The change made, drawn, then what's new slides in. */
  run(way: SlideWay, update: () => void, scope: SlideScope = 'sheet'): void {
    update();
    this.app.tick();
    Slide.in(way, scope);
  }

  /** What's marked for the scope slides in (already drawn). */
  static in(way: SlideWay, scope: SlideScope): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const prefix = scope === 'route' ? 'page' : 'sheet';
    for (const el of document.querySelectorAll<HTMLElement>(`[data-vt^="${prefix}"]`)) {
      const pane = el.dataset['vt'] === `${prefix === 'page' ? 'page' : 'sheet-pane'}`;
      const from = pane ? (way === 'forward' ? '100%' : '-35%') : way === 'forward' ? '1.5rem' : '-1.5rem';
      el.animate(
        pane
          ? [{ transform: `translateX(${from})` }, { transform: 'none' }]
          : [{ transform: `translateX(${from})`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 380, easing: EASE },
      );
    }
  }

  /** A move between addresses: back when the new one is the old one's start (/library/1 → /library), else forward. */
  static way(from: string, to: string): SlideWay {
    const parts = (url: string) => url.split(/[?#]/)[0].split('/').filter(Boolean);
    const old = parts(from);
    const next = parts(to);
    return next.length < old.length && next.every((part, i) => part === old[i]) ? 'back' : 'forward';
  }
}
