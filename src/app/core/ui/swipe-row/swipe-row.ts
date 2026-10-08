import { Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { Icon } from '../icon/icon';

const REVEAL = 72; // px revealed when the row is swiped open (room for the round button)
const FULL_SWIPE = 0.6; // fraction of the row width that deletes without the button

/**
 * Swipe-to-delete wrapper for a list row (touch and mouse):
 * - drag left: a round red trash button grows into the gap behind the row; release past
 *   half of it to keep it open, tap it to delete;
 * - drag further (60% of the row): the row slides away and is deleted right away.
 * Only horizontal drags are taken, vertical scrolling keeps working. A click right after a
 * drag, or while open, is swallowed (it closes the row instead of opening it).
 *
 *   <app-swipe-row (delete)="remove(item)" [label]="'action.delete' | t">
 *     <button class="list-row" (click)="open(item)">…</button>
 *   </app-swipe-row>
 */
@Component({
  selector: 'app-swipe-row',
  imports: [Icon],
  host: {
    class: 'block',
    '(pointerdown)': 'onDown($event)',
    '(pointermove)': 'onMove($event)',
    '(pointerup)': 'onUp()',
    '(pointercancel)': 'onUp()',
    '(document:pointerdown)': 'onDocumentDown($event)',
  },
  template: `
    <div class="relative overflow-hidden">
      <!-- Gap the row leaves behind, with the round delete button centered in it -->
      <div class="swipe-action" [style.width.px]="-offset()">
        <button
          type="button"
          class="swipe-delete"
          [style.transform]="'scale(' + revealProgress() + ')'"
          [attr.aria-label]="label()"
          (click)="remove()"
        >
          <app-icon name="trash" class="size-5" />
        </button>
      </div>
      <div
        class="relative touch-pan-y"
        [style.transform]="offset() ? 'translateX(' + offset() + 'px)' : null"
        [style.transition]="dragging() ? 'none' : 'transform 260ms var(--ease-ios)'"
      >
        <ng-content />
      </div>
    </div>
  `,
})
export class SwipeRow {
  readonly label = input('');
  readonly delete = output<void>();

  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly offset = signal(0); // ≤ 0
  protected readonly dragging = signal(false);
  // 0 → 1 as the gap opens up to the reveal width; drives the button's grow-in.
  protected readonly revealProgress = computed(() => Math.min(1, -this.offset() / REVEAL));

  private startX = 0;
  private startY = 0;
  private startOffset = 0;
  private axis: 'x' | 'y' | null = null;
  private pointerId: number | null = null;
  private swallowClick = false;
  private removing = false;

  constructor() {
    // Capture phase: runs before the row's own (click), so a drag never opens the row.
    this.host.addEventListener(
      'click',
      (e) => {
        if (!this.swallowClick && this.offset() === 0) return;
        if ((e.target as HTMLElement).closest('.swipe-action')) return;
        e.stopPropagation();
        e.preventDefault();
        this.swallowClick = false;
        this.close();
      },
      true,
    );
  }

  protected onDown(e: PointerEvent): void {
    if (this.removing || (e.target as HTMLElement).closest('.swipe-action')) return;
    if (this.offset() === 0) this.swallowClick = false; // stale flag from a drag without a click
    this.pointerId = e.pointerId;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startOffset = this.offset();
    this.axis = null;
  }

  protected onMove(e: PointerEvent): void {
    if (e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    if (this.axis === null) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        this.axis = 'x';
        this.dragging.set(true);
        this.host.setPointerCapture(e.pointerId);
      } else if (Math.abs(dy) > 8) {
        this.axis = 'y'; // vertical scroll — leave it alone
      }
    }
    if (this.axis === 'x') this.offset.set(Math.min(0, this.startOffset + dx));
  }

  protected onUp(): void {
    if (this.pointerId === null) return;
    this.pointerId = null;
    if (this.axis !== 'x') return;
    this.dragging.set(false);
    this.swallowClick = true;
    const pulled = -this.offset();
    if (pulled > this.host.offsetWidth * FULL_SWIPE) this.remove();
    else this.offset.set(pulled > REVEAL / 2 ? -REVEAL : 0);
  }

  protected onDocumentDown(e: PointerEvent): void {
    if (this.offset() && !this.host.contains(e.target as Node)) this.close();
  }

  protected remove(): void {
    if (this.removing) return;
    this.removing = true;
    this.offset.set(-this.host.offsetWidth); // slide the row away, then delete
    setTimeout(() => this.delete.emit(), 220);
  }

  private close(): void {
    this.offset.set(0);
  }
}
