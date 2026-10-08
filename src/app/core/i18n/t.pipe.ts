import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import { TranslationKey } from './translations';

/** `{{ 'action.save' | t }}` — re-evaluates when the language changes. */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: TranslationKey): string {
    return this.i18n.t(key);
  }
}
