import { afterNextRender, booleanAttribute, Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * Phones: a menu as iOS 26's (as the Claude app's ⋯) — a glass panel by the top bar's right, big
 * round corners, its rows an icon and a name (`button[uiPopItem]`), lines between groups
 * (`<ui-pop-separator />`). A tap outside closes it; `close()` from inside (after a pick) too, then
 * `closed`. In the browser's top layer: over the top bar and a full-screen page.
 *   @if (open()) { <ui-popover #m (closed)="open.set(false)"><button uiPopItem icon="duplicate" (click)="m.close(); …">…</button></ui-popover> }
 */
@Component({
  selector: 'ui-popover',
  host: {
    popover: 'manual',
    class: 'fixed inset-0 m-0 size-full max-h-none max-w-none overflow-visible border-0 bg-transparent p-0',
    '(click)': 'close()',
  },
  template: `
    <div
      #panel
      role="menu"
      (click)="$event.stopPropagation()"
      class="absolute right-4 flex max-h-[70vh] w-64 origin-top-right animate-menu-in flex-col overflow-y-auto overscroll-contain rounded-[2.25rem] glass py-2
             transition-[opacity,scale] duration-200 data-closing:scale-95 data-closing:opacity-0"
      [style.top]="'calc(env(safe-area-inset-top) + 3.75rem)'"
      [attr.data-closing]="closing() ? '' : null"
    >
      <ng-content />
    </div>
  `,
})
export class UiPopover {
  readonly closed = output<void>();
  protected readonly closing = signal(false);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  constructor() {
    afterNextRender(() => this.host.isConnected && this.host.showPopover());
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && this.close();
    document.addEventListener('keydown', onKey);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', onKey));
  }

  close(): void {
    if (this.closing()) return;
    this.closing.set(true);
    setTimeout(() => this.closed.emit(), 180);
  }
}

/** A row of a `ui-popover`: its icon (thin, as the text), its name; `danger`: red; `itemValue`: gray at the right. */
@Component({
  selector: 'button[uiPopItem], div[uiPopItem]',
  imports: [Icon],
  host: {
    class: 'flex h-11 w-full shrink-0 items-center gap-4 px-5 text-left text-body text-fg [button&]:active:bg-highlight',
    '[class.text-danger]': 'danger()',
    role: 'menuitem',
  },
  template: `
    @if (icon(); as name) {
      <app-icon [name]="name" class="size-6 shrink-0" />
    }
    <span class="min-w-0 flex-1 truncate"><ng-content /></span>
    <ng-content select="[itemValue]" />
  `,
})
export class UiPopItem {
  readonly icon = input<IconName>();
  readonly danger = input(false, { transform: booleanAttribute });
}

/** A line between a `ui-popover`'s groups. */
@Component({
  selector: 'ui-pop-separator',
  host: { class: 'mx-5 my-2 block h-px shrink-0 bg-separator' },
  template: '',
})
export class UiPopSeparator {}
