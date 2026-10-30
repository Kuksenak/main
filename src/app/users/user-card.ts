import { Component, computed, inject, input, signal } from '@angular/core';
import { AREA_LABELS } from '../auth/permissions';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiList, UiListItem, UiOption, UiToggle, UiWheel } from '../core/ui';
import { User, UsersStore } from './users.store';

/**
 * Phones (the account sheet's Users, a user tapped): their card — the email, the last sign-in;
 * their access, per area a switch, saved as soon as it's switched (the admins: locked, on); the AI's
 * questions a day, turned on a wheel.
 */
@Component({
  selector: 'app-user-card',
  imports: [TranslatePipe, UiList, UiListItem, UiToggle, UiWheel],
  templateUrl: './user-card.html',
})
export class UserCard {
  readonly userId = input.required<string>();
  protected readonly store = inject(UsersStore);
  // (as now: their access changes as it's switched)
  protected readonly user = computed(() => this.store.user(this.userId()));

  protected readonly areaLabels = AREA_LABELS;

  // (the few to pick from; a number set otherwise — on a desktop — among them too)
  protected readonly wheelOpen = signal(false);

  // (0 to 100 by fives; the number they have now — set on a desktop, or the app's own — among them too)
  protected limits(user: User): UiOption[] {
    const steps = Array.from({ length: 21 }, (_, i) => i * 5);
    const now = this.perDay(user);
    const numbers = steps.includes(now) ? steps : [...steps, now].sort((a, b) => a - b);
    return numbers.map((n) => ({ value: String(n), label: String(n) }));
  }

  protected perDay(user: User): number {
    return user.aiPerDay ?? this.store.aiDefault() ?? 0;
  }

  protected pick(user: User, value: string): void {
    this.store.setAiLimit(user, Number(value));
  }
}
