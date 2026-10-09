import { Component, DestroyRef, inject } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ToolbarService } from '../core/services/toolbar.service';

/**
 * Settings, one row each (Claude-like): the name and a gray hint on the left, the control on
 * the right (below on mobile); hairlines between rows. For now just the language.
 */
@Component({
  selector: 'app-settings',
  imports: [TranslatePipe],
  template: `
    <main class="flex w-full flex-1 flex-col overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1">
      <div class="flex w-full max-w-3xl flex-col">
        <div class="flex flex-col gap-3 border-b border-[var(--separator)] py-4 desktop:flex-row desktop:items-center desktop:justify-between desktop:gap-6">
          <div class="flex flex-col gap-0.5">
            <p class="text-body font-medium">{{ 'account.language' | t }}</p>
            <p class="text-footnote opacity-50">{{ 'settings.languageHint' | t }}</p>
          </div>
          <div class="segmented">
            @for (lang of i18n.languages; track lang.code) {
              <button type="button" (click)="i18n.setLang(lang.code)" [attr.aria-pressed]="i18n.lang() === lang.code">{{ lang.label }}</button>
            }
          </div>
        </div>
      </div>
    </main>
  `,
})
export class Settings {
  protected readonly i18n = inject(I18nService);

  constructor() {
    // Mobile toolbar: just ‹ (no title).
    const toolbar = inject(ToolbarService);
    toolbar.back.set(true);
    inject(DestroyRef).onDestroy(() => toolbar.back.set(false));
  }
}
