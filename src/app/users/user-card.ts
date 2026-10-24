import { Component, inject, input } from '@angular/core';
import { AREA_LABELS } from '../auth/permissions';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon, UiCard, UiListRow, UiSegmented } from '../core/ui';
import { User, UsersStore } from './users.store';

/**
 * Phones (the account sheet's Users, a user tapped): their card — the email, the last sign-in;
 * their access, per area none / read / write, saved as soon as it's picked (the admins: locked).
 */
@Component({
  selector: 'app-user-card',
  imports: [Icon, TranslatePipe, UiCard, UiListRow, UiSegmented],
  templateUrl: './user-card.html',
})
export class UserCard {
  readonly user = input.required<User>();
  protected readonly store = inject(UsersStore);
  protected readonly areaLabels = AREA_LABELS;
}
