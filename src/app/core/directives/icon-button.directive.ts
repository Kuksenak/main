import { Directive, computed, input } from '@angular/core';
import {
  ICON_BUTTON_BASE,
  ICON_BUTTON_VARIANT,
  IconButtonVariant,
} from '../ui/button/button-styles';

/**
 * Circular icon button in iOS-26 style. Applies to a native `<button>` / `<a>`.
 * The icon goes inside as an `<svg>` (sized to ~50% of the button automatically).
 *
 * @example
 * <button appIconButton aria-label="Add"><svg>…</svg></button>
 * <button appIconButton="warn" aria-label="Delete"><svg>…</svg></button>
 */
@Directive({
  selector: 'button[appIconButton], a[appIconButton]',
  host: {
    '[class]': 'hostClass()',
  },
})
export class IconButtonDirective {
  // Aliased to the selector so `appIconButton="warn"` sets the variant directly.
  // Bare `appIconButton` binds '' → falls back to 'glass'.
  readonly variant = input<IconButtonVariant | ''>('glass', { alias: 'appIconButton' });

  protected readonly hostClass = computed(() => {
    const variantClass = ICON_BUTTON_VARIANT[this.variant() || 'glass'] ?? ICON_BUTTON_VARIANT.glass;
    return `${ICON_BUTTON_BASE} ${variantClass}`;
  });
}
