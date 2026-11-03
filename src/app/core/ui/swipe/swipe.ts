import { Component, DestroyRef, ElementRef, inject, input, output, signal } from '@angular/core';

// (one row open at a time: another swiped — the open one closes)
let opened: UiSwipe | null = null;

const OPEN = 120; // (an action's room, the row open)

/**
 * Phones: a row swiped sideways (as iOS's lists) — to the left: its `end` action at the right (red:
 * delete, remove); to the right: its `start` action at the left (the accent: restore). Let go past
 * half of it: it stays open, a tap does it (`endPicked` / `startPicked`); else back. A vertical
 * move scrolls as ever.
 *   <ui-swipe [end]="'Remove'" (endPicked)="remove()"><div uiListItem>…</div></ui-swipe>
 */
@Component({
  selector: 'ui-swipe',
  host: {
    // (its row's hairline kept — each row's the only one in its swipe, "last" — but the last swipe's)
    // (touch-action: the browser scrolls up / down, the sideways moves are its)
    class: 'relative block touch-pan-y overflow-hidden [&_[uiListItem]]:after:block! [&:last-child_[uiListItem]]:after:hidden! [&_[uiRow]]:after:block! [&:last-child_[uiRow]]:after:hidden!',
    '(touchstart)': 'start($event)',
    '(touchmove)': 'move($event)',
    '(touchend)': 'end()',
    '(touchcancel)': 'end()',
  },
  template: `
    <!-- (an action, as iOS 26's: a round button of its own in the room the row left, not a block) -->
    @if (x() > 0 && startLabel()) {
      <div class="absolute inset-y-0 left-0 flex overflow-hidden py-1.5 pr-2 pl-1" [style.width.px]="x()">
        <button type="button" (click)="pick('start')" class="min-w-0 flex-1 rounded-2xl bg-accent px-3 text-body leading-tight font-medium text-on-accent">
          {{ startLabel() }}
        </button>
      </div>
    }
    @if (x() < 0 && endLabel()) {
      <div class="absolute inset-y-0 right-0 flex overflow-hidden py-1.5 pr-1 pl-2" [style.width.px]="-x()">
        <button type="button" (click)="pick('end')" class="min-w-0 flex-1 rounded-2xl bg-danger px-3 text-body leading-tight font-medium text-on-accent">
          {{ endLabel() }}
        </button>
      </div>
    }
    <div [style.transform]="x() ? 'translateX(' + x() + 'px)' : null" [class.transition-transform]="!dragging()">
      <ng-content />
    </div>
  `,
})
export class UiSwipe {
  /** The action swiped to the right (none: it doesn't go that way). */
  readonly startLabel = input<string | null>(null, { alias: 'start' });
  /** The action swiped to the left (none: it doesn't go that way). */
  readonly endLabel = input<string | null>(null, { alias: 'end' });
  readonly startPicked = output<HTMLElement>();
  readonly endPicked = output<HTMLElement>();

  protected readonly x = signal(0);
  protected readonly dragging = signal(false);
  private touch: { x: number; y: number; from: number; mode: 'unknown' | 'swipe' | 'scroll' } | null = null;
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  constructor() {
    inject(DestroyRef).onDestroy(() => opened === this && (opened = null));
  }

  close(): void {
    this.x.set(0);
    if (opened === this) opened = null;
  }

  protected start(e: TouchEvent): void {
    if (opened && opened !== this) opened.close();
    const t = e.touches[0];
    this.touch = { x: t.clientX, y: t.clientY, from: this.x(), mode: 'unknown' };
  }

  protected move(e: TouchEvent): void {
    const touch = this.touch;
    if (!touch || touch.mode === 'scroll') return;
    const t = e.touches[0];
    const dx = t.clientX - touch.x;
    const dy = t.clientY - touch.y;
    if (touch.mode === 'unknown') {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      touch.mode = Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'scroll';
      if (touch.mode === 'scroll') return;
    }
    // (sideways: its own — not the page's scrolling, nor a sheet's pull down: it jumped up and down)
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    this.dragging.set(true);
    const min = this.endLabel() ? -OPEN * 1.25 : 0;
    const max = this.startLabel() ? OPEN * 1.25 : 0;
    this.x.set(Math.max(min, Math.min(max, touch.from + dx)));
  }

  // (let go: past half of an action — open on it; else back)
  protected end(): void {
    this.dragging.set(false);
    this.touch = null;
    const x = this.x();
    const open = x < -OPEN / 2 ? -OPEN : x > OPEN / 2 ? OPEN : 0;
    this.x.set(open);
    opened = open ? this : opened === this ? null : opened;
  }

  // (picked: closed; the row itself given — a question asked by it)
  protected pick(side: 'start' | 'end'): void {
    this.close();
    if (side === 'start') this.startPicked.emit(this.host);
    else this.endPicked.emit(this.host);
  }
}
