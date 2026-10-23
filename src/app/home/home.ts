import { Component, computed, inject } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { Icon, ICONS } from '../core/ui';
import { PageTitle } from '../layout/page-title';

/**
 * The start page — for now the app's icons, each at 20px (as in the menus) and at 48px (as on the
 * phones' sections sheet), to judge their look.
 */
@Component({
  selector: 'app-home',
  imports: [Icon],
  templateUrl: './home.html',
})
export class Home {
  protected readonly icons = ICONS;

  constructor() {
    const i18n = inject(I18nService);
    inject(PageTitle).show(computed(() => i18n.t('nav.home')));
  }
}
