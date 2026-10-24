import { Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon, ICONS, UiDate, UiOption, UiSelect, UiTime } from '../core/ui';
import { PageTitle } from '../layout/page-title';

/**
 * The start page — for now the kit to judge: the choosers (a day, a time — as the old app's — and
 * a choice of a few: the system's own select), then the app's icons, each at 26px outlined (as in
 * the menus) and at 48px coloured in (as on the phones' sections sheet).
 */
@Component({
  selector: 'app-home',
  imports: [Icon, TranslatePipe, UiDate, UiSelect, UiTime],
  templateUrl: './home.html',
})
export class Home {
  protected readonly icons = ICONS;

  // (the choosers' values: today, the next half hour, a level)
  protected readonly day = signal(new Date().toISOString().slice(0, 10));
  protected readonly time = signal('09:30');
  protected readonly level = signal<string | null>('B1');
  protected readonly levels: UiOption[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => ({ value: l, label: l }));
  // (with icons: the app's sections)
  protected readonly section = signal<string | null>('library');
  protected readonly sections = computed<UiOption[]>(() => [
    { value: 'home', label: this.i18n.t('nav.home'), icon: 'home' },
    { value: 'schedule', label: this.i18n.t('nav.schedule'), icon: 'calendar' },
    { value: 'library', label: this.i18n.t('nav.library'), icon: 'library' },
  ]);
  private readonly i18n = inject(I18nService);

  constructor() {
    inject(PageTitle).show(computed(() => this.i18n.t('nav.home')));
  }
}
