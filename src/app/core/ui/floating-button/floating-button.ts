import { booleanAttribute, Component, input } from '@angular/core';

/**
 * Phones: a button floating over the page, as iOS 26's — frosted glass with a white rim and a
 * soft wide shadow (`accent`: solid, in the accent color); it grows under the finger (a fifth bigger) (its
 * action when let go). `round`: a circle (an icon, a letter); else a capsule with its label (e.g. Today).
 */
@Component({
  selector: 'button[uiFloatingButton], a[uiFloatingButton]',
  host: {
    class:
      'inline-flex h-round shrink-0 items-center justify-center gap-1.5 rounded-full text-body font-medium ' +
      'transition-[scale] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:transform-none active:scale-120 ' +
      'backdrop-blur-[20px] backdrop-saturate-[180%]',
    '[class.w-round]': 'round()',
    '[class.px-capsule-x]': '!round()',
    '[class.bg-glass]': '!accent()',
    '[class.text-fg]': '!accent()',
    '[class.shadow-glass]': '!accent()',
    '[class.bg-accent]': 'accent()',
    '[class.text-on-accent]': 'accent()',
    '[class.shadow-accent]': 'accent()',
  },
  template: `<ng-content />`,
})
export class UiFloatingButton {
  readonly accent = input(false, { transform: booleanAttribute });
  readonly round = input(false, { transform: booleanAttribute });
}
