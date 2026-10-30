import { Component, computed, inject, input } from '@angular/core';
import { AREA_LABELS } from '../auth/permissions';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon, UiList, UiListItem, UiToggle } from '../core/ui';
import { User, UsersStore } from './users.store';

/**
 * Phones (the account sheet's Users, a user tapped): their card — the email, the last sign-in;
 * their access, per area a switch, saved as soon as it's switched (the admins: locked, on); the AI's
 * questions a day, picked from a few.
 */
@Component({
  selector: 'app-user-card',
  imports: [Icon, TranslatePipe, UiList, UiListItem, UiToggle],
  templateUrl: './user-card.html',
})
export class UserCard {
  readonly userId = input.required<string>();
  protected readonly store = inject(UsersStore);
  // (as now: their access changes as it's switched)
  protected readonly user = computed(() => this.store.user(this.userId()));

  protected readonly areaLabels = AREA_LABELS;

  // (the few to pick from; a number set otherwise — on a desktop — among them too)
  protected limits(user: User): number[] {
    const few = [0, 5, 10, 20, 30, 50, 100, 200, 500];
    const set = user.aiPerDay;
    return set === null || few.includes(set) ? few : [...few, set].sort((a, b) => a - b);
  }

  protected pick(user: User, value: string): void {
    this.store.setAiLimit(user, value === '' ? null : Number(value));
  }
}
