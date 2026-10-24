import { Component, computed, inject, input } from '@angular/core';
import { AREA_LABELS } from '../auth/permissions';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiList, UiListItem, UiToggle } from '../core/ui';
import { UsersStore } from './users.store';

/**
 * Phones (the account sheet's Users, a user tapped): their card — the email, the last sign-in;
 * their access, per area a switch, saved as soon as it's switched (the admins: locked, on).
 */
@Component({
  selector: 'app-user-card',
  imports: [TranslatePipe, UiList, UiListItem, UiToggle],
  templateUrl: './user-card.html',
})
export class UserCard {
  readonly userId = input.required<string>();
  protected readonly store = inject(UsersStore);
  // (as now: their access changes as it's switched)
  protected readonly user = computed(() => this.store.user(this.userId()));

  protected readonly areaLabels = AREA_LABELS;
}
