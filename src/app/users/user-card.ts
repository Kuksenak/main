import { Component, computed, inject, input, signal } from '@angular/core';
import { AREA_LABELS } from '../auth/permissions';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiList, UiListItem, UiOption, UiToggle, UiWheel } from '../core/ui';
import { I18nService } from '../core/i18n/i18n.service';
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
  private readonly i18n = inject(I18nService);
  protected readonly wheelOpen = signal(false);

  protected limits(user: User): UiOption[] {
    const few = [0, 1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500];
    const set = user.aiPerDay;
    const numbers = set === null || few.includes(set) ? few : [...few, set].sort((a, b) => a - b);
    return [
      { value: '', label: `${this.i18n.t('users.aiDefault')} (${this.store.aiDefault()})` },
      ...numbers.map((n) => ({ value: String(n), label: String(n) })),
    ];
  }

  protected pick(user: User, value: string): void {
    this.store.setAiLimit(user, value === '' ? null : Number(value));
  }
}
