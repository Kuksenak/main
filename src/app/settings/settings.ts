import { Component, DestroyRef, effect, inject } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';

/** Settings: for now just the app language. */
@Component({
  selector: 'app-settings',
  imports: [Icon, TranslatePipe],
  template: `
    <main class="flex w-full flex-1 flex-col gap-6 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
      <div class="flex w-full flex-col gap-1.5 desktop:max-w-md">
        <span class="text-footnote px-4 uppercase opacity-50">{{ 'account.language' | t }}</span>
        <div class="card">
          @for (lang of i18n.languages; track lang.code) {
            <button type="button" (click)="i18n.setLang(lang.code)" class="list-row w-full text-left">
              <span>{{ lang.label }}</span>
              @if (i18n.lang() === lang.code) {
                <app-icon name="check" class="size-5 text-[var(--accent)]" />
              }
            </button>
          }
        </div>
      </div>
    </main>
  `,
})
export class Settings {
  protected readonly i18n = inject(I18nService);

  constructor() {
    // Mobile toolbar: the page title.
    const toolbar = inject(ToolbarService);
    effect(() => toolbar.title.set(this.i18n.t('nav.settings')));
    inject(DestroyRef).onDestroy(() => toolbar.title.set(''));
  }
}
