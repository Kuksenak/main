import { Component, inject, output } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiCard, UiListRow } from '../core/ui';
import { User, UsersStore } from './users.store';

/**
 * Phones (the account sheet's Users): everyone who has signed in, latest first — a row each (the
 * name, else the email; Admin in gray; ›): a tap opens their card (`picked`).
 */
@Component({
  selector: 'app-users-list',
  imports: [TranslatePipe, UiCard, UiListRow],
  template: `
    @if (store.loadError()) {
      <p class="px-row-x text-body text-danger">{{ 'users.loadError' | t }}</p>
    }
    @if (store.users(); as users) {
      @if (!users.length) {
        <p class="px-row-x text-body text-fg-secondary">{{ 'users.empty' | t }}</p>
      } @else {
        <ui-card>
          @for (user of users; track user.id) {
            <button type="button" uiListRow icon="person" chevron (click)="picked.emit(user)">
              {{ store.name(user) ?? user.email }}
              @if (user.isAdmin) {
                <span rowValue class="text-fg-secondary">{{ 'users.admin' | t }}</span>
              }
            </button>
          }
        </ui-card>
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
