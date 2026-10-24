import { ApplicationRef, inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';

/** Which way a move goes: deeper (the new one in from the right) or back (from the left). */
export type SlideWay = 'forward' | 'back';

/** What moves: the page (the router's: the page, its title, ‹ — the top bar staying over it) or a sheet's pane (its ‹, name, what's in it). */
export type SlideScope = 'route' | 'sheet';

/**
 * Moving between views as iOS does (View Transitions): what's marked in the markup for the scope
 * (`data-vt="page"`, `data-vt="sheet-pane"`, …: styles/base.css names them while it's that
 * scope's move — else a page named under a sheet would show over it) slides — the new in from the
 * right as the old goes a little left and fades; back, the other way. `run(way, update)`: the change made,
 * the page drawn (and a moment for a @defer whose code is in already), then it slides. Browsers
 * without it, or set to reduce motion: just the change.
 */
@Injectable({ providedIn: 'root' })
export class Slide {
  private readonly app = inject(ApplicationRef);

  run(way: SlideWay, update: () => void, scope: SlideScope = 'sheet'): void {
    const doc = document as Document & { startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> } };
    if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      update();
      return;
    }
    Slide.mark(way, scope);
    doc
      .startViewTransition(async () => {
        update();
        this.app.tick();
        await new Promise((done) => setTimeout(done));
        this.app.tick();
      })
      .finished.finally(() => Slide.mark(null));
  }

  /** The way and the scope, on <html data-slide data-slide-scope> (the CSS reads them); null: none. */
  static mark(way: SlideWay | null, scope: SlideScope = 'sheet'): void {
    const data = document.documentElement.dataset;
    if (way) {
      data['slide'] = way;
      data['slideScope'] = scope;
    } else {
      delete data['slide'];
      delete data['slideScope'];
    }
  }
}

/** A move between routes: back when the new address is the old one's start (/library/1 → /library), else forward. */
export function routeWay(from: ActivatedRouteSnapshot, to: ActivatedRouteSnapshot): SlideWay {
  const leaf = (route: ActivatedRouteSnapshot): ActivatedRouteSnapshot => (route.firstChild ? leaf(route.firstChild) : route);
  const path = (route: ActivatedRouteSnapshot) => leaf(route).pathFromRoot.flatMap((r) => r.url.map((u) => u.path));
  const old = path(from);
  const next = path(to);
  return next.length < old.length && next.every((part, i) => part === old[i]) ? 'back' : 'forward';
}
