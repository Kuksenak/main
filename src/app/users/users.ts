import { Component, computed, inject } from '@angular/core';
import { AREA_LABELS } from '../auth/permissions';
import { desktop } from '../core/device';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiCard, UiListRow, UiSegmented } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { UsersStore } from './users.store';

/**
 * Users (the admins only: adminGuard): everyone who has signed in, latest first — the name, the
 * email, the last sign-in — and per area their level (none / read / write), saved as soon as it's
 * picked (back as it was if that fails; see UsersStore). The admins: write everywhere, locked.
 * Desktop: a table, a column per area; phones (when opened by its address — the account sheet has
 * its own Users): a card per user.
 */
@Component({
  selector: 'app-users',
  imports: [TranslatePipe, UiCard, UiListRow, UiSegmented],
  templateUrl: './users.html',
})
export class Users {
  private readonly store = inject(UsersStore);

  protected readonly desktop = desktop;
  protected readonly areaLabels = AREA_LABELS;

  protected readonly users = this.store.users;
  protected readonly areas = this.store.areas;
  protected readonly loadError = this.store.loadError;
  protected readonly saveError = this.store.saveError;
  protected readonly levels = this.store.levels;
  protected readonly name = this.store.name.bind(this.store);
  protected readonly lastSignIn = this.store.lastSignIn.bind(this.store);
  protected readonly level = this.store.level.bind(this.store);
  protected readonly set = this.store.set.bind(this.store);

  constructor() {
    const i18n = inject(I18nService);
    inject(PageTitle).show(computed(() => i18n.t('users.title')));
    this.store.load();
  }
}
