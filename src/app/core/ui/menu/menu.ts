import { CdkConnectedOverlay, ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { booleanAttribute, Component, input, output, viewChild } from '@angular/core';

// (its rows: plain ones and the ones of a choice — menuitem, menuitemradio)
const ROWS = '[role^="menuitem"]:not(:disabled)';

/**
 * A menu at its button (as the phones' — iOS 26's: big round corners, a hairline, a soft shadow, its
 * rows round; nothing dims): under the button, its right edge at the button's (above it, or from its left edge, when
 * there's no room). Render it with @if; `closed` fires on a click outside, Esc, Tab or a picked
 * row (`<button uiMenuItem>`). ↑ ↓ move between the rows; the first one has the focus.
 *   <button uiButton #b (click)="open.set(!open())" [attr.aria-expanded]="open()">…</button>
 *   @if (open()) { <ui-menu [origin]="b.element" (closed)="open.set(false)">…</ui-menu> }
 */
@Component({
  selector: 'ui-menu',
  imports: [OverlayModule],
  // (its own element takes no room — the menu's drawn over the page: put in a row of buttons, it
  // added a gap there and the buttons jumped)
  host: { class: 'hidden' },
  templateUrl: './menu.html',
})
export class UiMenu {
  readonly origin = input.required<HTMLElement>();
  /** (short rows: 12rem wide at least, not the menus' 17rem) */
  readonly narrow = input(false, { transform: booleanAttribute });
  /** A submenu (as File › in Claude's): at its row's right (else its left), its top at the row's; no
   * backdrop of its own — its menu's rows stay under the pointer (another one opens its own) */
  readonly side = input(false, { transform: booleanAttribute });
  readonly closed = output<void>();

  private readonly overlay = viewChild.required(CdkConnectedOverlay);
  private done = false;

  protected readonly sidePositions: ConnectedPosition[] = [
    { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 4, offsetY: -6 },
    { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -4, offsetY: -6 },
  ];

  protected readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4 },
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 },
  ];

  close(): void {
    if (this.done) return;
    this.done = true;
    this.closed.emit();
  }

  // (a row picked: the menu goes — not one opening a submenu; the row's own click has run by now)
  protected picked(e: MouseEvent): void {
    const row = (e.target as HTMLElement).closest(ROWS);
    if (row && !row.hasAttribute('aria-haspopup')) this.close();
  }

  protected key(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.close();
      this.origin().focus(); // (back on its button, for the keys)
    } else if (e.key === 'Tab') {
      this.close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const at = this.rows().indexOf(document.activeElement as HTMLElement);
      this.focus(e.key === 'ArrowDown' ? at + 1 : at < 0 ? -1 : at - 1);
    }
  }

  // The n-th row, round at the ends (-1: the last)
  protected focus(n: number): void {
    const rows = this.rows();
    // (no scrolling to it: the page under the menu jumped as it opened)
    if (rows.length) rows[(n + rows.length) % rows.length].focus({ preventScroll: true });
  }

  private rows(): HTMLElement[] {
    const panel = this.overlay().overlayRef?.overlayElement;
    return panel ? [...panel.querySelectorAll<HTMLElement>(ROWS)] : [];
  }
}
