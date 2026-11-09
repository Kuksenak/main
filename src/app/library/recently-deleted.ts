import { Component, computed, inject } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiList, UiListItem } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { LibraryStore } from './library.store';
import { TrashList } from './trash-list';

/**
 * Phones' Recently deleted (a row on Home; ‹ back to it): the deleted pages (swipe: restore, delete
 * forever), Delete all under them — asked first. (Desktops: the sidebar's row, a window.)
 */
@Component({
  selector: 'app-recently-deleted',
  imports: [TranslatePipe, TrashList, UiList, UiListItem],
  template: `
    <div class="flex flex-col gap-6 px-4 pt-2 pb-24">
      <app-trash-list />
      @if (store.trash()?.length) {
        <ui-list>
          <button type="button" uiListItem icon="trash" danger (click)="store.askDeleteForever(null, $any($event.currentTarget))">
            {{ 'trash.emptyAll' | t }}
          </button>
        </ui-list>
      }
    </div>
  `,
})
export class RecentlyDeleted {
  protected readonly store = inject(LibraryStore);
  private readonly i18n = inject(I18nService);

  constructor() {
    inject(PageTitle).show(computed(() => this.i18n.t('trash.title')), '/');
  }
}
