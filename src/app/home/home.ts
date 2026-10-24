import { Component, computed, inject } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { Icon, ICONS } from '../core/ui';
import { PageFilter } from '../layout/page-filter';
import { PageTitle } from '../layout/page-title';

/**
 * The start page — for now the app's icons, each at 26px outlined (as in the menus) and at 48px
 * coloured in (as on the phones' sections sheet), to judge their look.
 */
@Component({
  selector: 'app-home',
  imports: [Icon],
  templateUrl: './home.html',
})
export class Home {
  // (phones: the top bar's filter — the icons whose name has what's typed)
  private readonly filter = inject(PageFilter);
  protected readonly icons = computed(() => ICONS.filter((name) => this.filter.matches(name)));

  constructor() {
    const i18n = inject(I18nService);
    inject(PageTitle).show(computed(() => i18n.t('nav.home')));
    this.filter.offer();
  }
}
