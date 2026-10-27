import { Component, computed, inject } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { PageTitle } from '../layout/page-title';
import { TrashList } from './trash-list';

/** Phones: Trash, a section of its own (the top bar's menu; desktops: the sidebar's Trash window). */
@Component({
  selector: 'app-trash',
  imports: [TrashList],
  template: `<div class="flex flex-col px-4 pt-2 pb-24"><app-trash-list /></div>`,
})
export class Trash {
  constructor() {
    const i18n = inject(I18nService);
    inject(PageTitle).show(computed(() => i18n.t('trash.title')));
  }
}
