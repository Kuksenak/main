import { Directive, computed, input } from '@angular/core';
import { BUTTON_BASE, BUTTON_VARIANT, ButtonVariant } from './button-styles';

/**
 * Text button in iOS style. Applies to a native `<button>` or `<a>` so all
 * native semantics (type, disabled, focus, form submit, routerLink) come for free.
 *
 * @example
 * <button appButton>Save</button>
 * <button appButton variant="warn">Delete</button>
 */
@Directive({
  selector: 'button[appButton], a[appButton]',
  host: {
    '[class]': 'hostClass()',
  },
})
export class ButtonDirective {
  readonly variant = input<ButtonVariant>('primary');

  protected readonly hostClass = computed(
    () => `${BUTTON_BASE} ${BUTTON_VARIANT[this.variant()]}`,
  );
}
