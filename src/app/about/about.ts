import { Component, DestroyRef, effect, inject } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ToolbarService } from '../core/services/toolbar.service';

@Component({
  selector: 'app-about',
  imports: [TranslatePipe],
  templateUrl: './about.html',
})
export class About {
  constructor() {
    // Mobile toolbar: ‹ and the page title.
    const toolbar = inject(ToolbarService);
    const i18n = inject(I18nService);
    effect(() => toolbar.title.set(i18n.t('nav.about')));
    toolbar.back.set(true);
    inject(DestroyRef).onDestroy(() => {
      toolbar.title.set('');
      toolbar.back.set(false);
    });
  }
}
