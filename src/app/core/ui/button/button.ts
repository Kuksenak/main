import { Component, ElementRef, inject, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A button (or a link styled as one), as Notion's head buttons: no fill, the small UI text, a thin
 * icon before the label (`icon`; or a `<ui-avatar>` put inside), ▾ after it (`caret`: it opens a
 * menu); with no label (just its icon, e.g. ⋯, ✕): square, as Notion's. A light fill on hover and while its menu is open (aria-expanded); a long label ends in ….
 */
@Component({
  selector: 'button[uiButton], a[uiButton]',
  imports: [Icon],
  host: {
    class:
      'inline-flex h-button shrink-0 items-center gap-1.5 rounded-button px-button-x text-ui leading-tight whitespace-nowrap text-fg ' +
      'has-[>span:empty]:w-button has-[>span:empty]:justify-center has-[>span:empty]:px-0 ' +
      'transition-colors duration-[120ms] not-disabled:hover:bg-tint aria-expanded:bg-tint not-disabled:active:bg-tint-strong disabled:opacity-45',
  },
  templateUrl: './button.html',
})
export class UiButton {
  readonly icon = input<IconName>();
  readonly caret = input(false);
  /** (the element: what a `<ui-menu>` opens at) */
  readonly element: HTMLElement = inject(ElementRef).nativeElement;
}
