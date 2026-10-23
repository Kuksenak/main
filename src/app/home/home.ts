import { Component, computed, inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { PageTitle } from '../layout/page-title';

/** The start page: who's signed in — a placeholder until the app's own pages (Log out: the layout's account menu). */
@Component({
  selector: 'app-home',
  template: `
    <div class="flex h-full flex-col items-center justify-center px-6 text-center">
      <p class="text-body text-fg-secondary">{{ auth.name() ?? auth.email() }}</p>
    </div>
  `,
})
export class Home {
  protected readonly auth = inject(AuthStore);

  constructor() {
    const i18n = inject(I18nService);
    inject(PageTitle).show(computed(() => i18n.t('nav.home')));
  }
}
