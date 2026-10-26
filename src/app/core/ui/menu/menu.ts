import { CdkConnectedOverlay, ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { booleanAttribute, Component, input, output, viewChild } from '@angular/core';

// (its rows: plain ones and the ones of a choice — menuitem, menuitemradio)
const ROWS = '[role^="menuitem"]:not(:disabled)';

/**
 * A menu at its button (as Notion's: a plain list on the dialogs' color, a soft shadow, nothing
 * dims): under the button, its right edge at the button's (above it, or from its left edge, when
 * there's no room). Render it with @if; `closed` fires on a click outside, Esc, Tab or a picked
 * row (`<button uiMenuItem>`). ↑ ↓ move between the rows; the first one has the focus.
 *   <button uiButton #b (click)="open.set(!open())" [attr.aria-expanded]="open()">…</button>
 *   @if (open()) { <ui-menu [origin]="b.element" (closed)="open.set(false)">…</ui-menu> }
 */
@Component({
  selector: 'ui-menu',
  imports: [OverlayModule],
  templateUrl: './menu.html',
})
export class UiMenu {
  readonly origin = input.required<HTMLElement>();
  /** (short rows: 12rem wide at least, not the menus' 17rem) */
  readonly narrow = input(false, { transform: booleanAttribute });
  readonly closed = output<void>();

  private readonly overlay = viewChild.required(CdkConnectedOverlay);
  private done = false;

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

  // (a row picked: the menu goes; the row's own click has run by now)
  protected picked(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest(ROWS)) this.close();
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
    if (rows.length) rows[(n + rows.length) % rows.length].focus();
  }

  private rows(): HTMLElement[] {
    const panel = this.overlay().overlayRef?.overlayElement;
    return panel ? [...panel.querySelectorAll<HTMLElement>(ROWS)] : [];
  }
}
