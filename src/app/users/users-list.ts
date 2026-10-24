import { Component, inject, output } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiList, UiListItem } from '../core/ui';
import { User, UsersStore } from './users.store';

/**
 * Phones (the account sheet's Users): everyone who has signed in, latest first — a row each (the
 * name, else the email; Admin in gray; ›): a tap opens their card (`picked`).
 */
@Component({
  selector: 'app-users-list',
  imports: [TranslatePipe, UiList, UiListItem],
  template: `
    @if (store.users(); as users) {
      @if (!users.length) {
        <p class="px-row-x text-body text-fg-secondary">{{ 'users.empty' | t }}</p>
      } @else {
        <ui-list>
          @for (user of users; track user.id) {
            <button type="button" uiListItem icon="person" chevron (click)="picked.emit(user)">
              {{ store.name(user) ?? user.email }}
              @if (user.isAdmin) {
                <span itemValue class="text-fg-secondary">{{ 'users.admin' | t }}</span>
              }
            </button>
          }
        </ui-list>
      }
    }
  `,
})
export class UsersList {
  readonly picked = output<User>();
  protected readonly store = inject(UsersStore);

  constructor() {
    this.store.load();
  }
}
