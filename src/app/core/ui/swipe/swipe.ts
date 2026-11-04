import { Component, computed, DestroyRef, ElementRef, inject, input, output, signal } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

// (one row open at a time: another swiped or tapped — the open one closes)
let opened: UiSwipe | null = null;

/** An action under a swiped row: its value (given back picked), its icon, its words (under it), its color. */
export interface SwipeAction {
  value: string;
  icon: IconName;
  label: string;
  tone?: 'gray' | 'danger' | 'accent';
}

const WIDTH = 64; // (an action's column: its circle, its words under it)

/**
 * Phones: a row swiped to the left (as iOS 26's Mail) — the row a card of its own as it goes (round
 * at its right), its actions at the right: circles with their icons, their words under them in
 * gray, growing as they're uncovered (never squeezed). Let go past half
 * of them: open, a tap does one (`picked`: its value, the row); else back. `toggle()` opens /
 * closes it (a tap on the row), `hint()` shows them for a moment (what's to swipe, once). A
 * vertical move scrolls as ever; a sideways one is its own — not a sheet's pull.
 *   <ui-swipe [actions]="[{ value: 'remove', label: 'Remove', tone: 'danger' }]" (picked)="remove()">…</ui-swipe>
 */
@Component({
  selector: 'ui-swipe',
  imports: [Icon],
  host: {
    // (touch-action: the browser scrolls up / down, the sideways moves are its; its row's hairline
    // kept — each row's the only one in its swipe, "last" — but the last swipe's)
    class:
      'relative block touch-pan-y overflow-hidden [&_[uiListItem]]:after:block! [&:last-child_[uiListItem]]:after:hidden! ' +
      '[&_[uiRow]]:after:block! [&:last-child_[uiRow]]:after:hidden!',
    '(touchstart)': 'start($event)',
    '(touchmove)': 'move($event)',
    '(touchend)': 'end()',
    '(touchcancel)': 'end()',
  },
  template: `
    <!-- (the actions at the right: a circle each, its words under it — growing as they're uncovered) -->
    <div class="absolute inset-y-0 right-0 flex items-center pr-1" [style.width.px]="open()" [class.invisible]="!x()">
      @for (a of actions(); track a.value) {
        <button
          type="button"
          (click)="pick(a.value)"
          class="flex flex-1 flex-col items-center gap-0.5 transition-transform duration-150"
          [style.transform]="'scale(' + grown() + ')'"
          [style.opacity]="grown()"
        >
          <span
            class="grid size-10 place-items-center rounded-full text-on-accent"
            [class.bg-danger]="a.tone === 'danger'"
            [class.bg-accent]="a.tone === 'accent'"
            [class.bg-fg-secondary]="!a.tone || a.tone === 'gray'"
          >
            <app-icon [name]="a.icon" class="size-5.5" />
          </span>
          <span class="text-caption leading-tight text-fg-secondary">{{ a.label }}</span>
        </button>
      }
    </div>
    <!-- (the row: moved, a card of its own — round at its right, a gray of its own, no hairline) -->
    <div
      [style.transform]="x() ? 'translateX(' + x() + 'px)' : null"
      [attr.data-moved]="x() ? '' : null"
      [attr.data-eased]="dragging() ? null : ''"
      class="duration-300 data-eased:transition-[transform,border-radius,background-color] data-moved:rounded-r-[1.75rem] data-moved:bg-tint data-moved:*:after:opacity-0"
    >
      <ng-content />
    </div>
  `,
})
export class UiSwipe {
  readonly actions = input<SwipeAction[]>([]);
  readonly picked = output<{ value: string; row: HTMLElement }>();

  protected readonly x = signal(0);
  protected readonly dragging = signal(false);
  // (open: the actions' room — their columns, a margin at each side)
  protected readonly open = computed(() => {
    const n = this.actions().length;
    return n ? n * WIDTH + 16 : 0;
  });
  // (how far they've grown: half uncovered — 0.4, whole — 1)
  protected readonly grown = computed(() => {
    const o = this.open();
    return o ? Math.max(0.4, Math.min(1, -this.x() / o)) : 0;
  });
  private touch: { x: number; y: number; from: number; mode: 'unknown' | 'swipe' | 'scroll' } | null = null;
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  constructor() {
    inject(DestroyRef).onDestroy(() => opened === this && (opened = null));
  }

  close(): void {
    this.x.set(0);
    if (opened === this) opened = null;
  }

  /** Open ⇄ closed (a tap on the row). */
  toggle(): void {
    if (this.x()) return this.close();
    if (opened && opened !== this) opened.close();
    this.x.set(-this.open());
    opened = this;
  }

  /** Its actions shown for a moment, then back (what there is to swipe). */
  hint(): void {
    if (this.x()) return;
    this.x.set(-Math.min(this.open(), 72));
    setTimeout(() => !this.touch && this.x.set(0), 650);
  }

  protected start(e: TouchEvent): void {
    if (opened && opened !== this) opened.close();
    const t = e.touches[0];
    this.touch = { x: t.clientX, y: t.clientY, from: this.x(), mode: 'unknown' };
  }

  protected move(e: TouchEvent): void {
    const touch = this.touch;
    if (!touch || touch.mode === 'scroll' || !this.open()) return;
    const t = e.touches[0];
    const dx = t.clientX - touch.x;
    const dy = t.clientY - touch.y;
    if (touch.mode === 'unknown') {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      touch.mode = Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'scroll';
      if (touch.mode === 'scroll') return;
    }
    // (sideways: its own — not the page's scrolling, nor a sheet's pull down)
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    this.dragging.set(true);
    this.x.set(Math.max(-this.open() * 1.2, Math.min(0, touch.from + dx)));
  }

  // (let go after a swipe: past half of the actions — open; else back)
  protected end(): void {
    const swiped = this.touch?.mode === 'swipe';
    this.dragging.set(false);
    this.touch = null;
    if (!swiped) return;
    const isOpen = this.x() < -this.open() / 2;
    this.x.set(isOpen ? -this.open() : 0);
    opened = isOpen ? this : opened === this ? null : opened;
  }

  // (picked: closed; the row given — a question asked by it)
  protected pick(value: string): void {
    this.close();
    this.picked.emit({ value, row: this.host });
  }
}
