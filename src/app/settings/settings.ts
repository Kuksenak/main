import { Component, DestroyRef, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { Toggle } from '../core/ui/toggle';
import { GoogleCalendarService } from '../schedule/google-calendar.service';

/**
 * Settings, opened from the account menu. Integrations: Google Calendar (its events in the
 * schedule) — switching it on goes through Google's consent screen and comes back here
 * (?calendar=connected / error / disabled), off disconnects.
 */
@Component({
  selector: 'app-settings',
  imports: [Icon, Toggle, TranslatePipe],
  template: `
    <main class="flex w-full flex-1 flex-col gap-4 px-4 pb-8 pt-1 desktop:max-w-xl">
      <h1 class="text-xl font-semibold mobile:hidden">{{ 'nav.settings' | t }}</h1>

      <div class="flex flex-col gap-1.5">
        <span class="card-label">{{ 'settings.integrations' | t }}</span>
        <div class="card">
          <div class="list-row py-2.5">
            <app-icon name="google" class="size-6 shrink-0" />
            <div class="min-w-0 flex-1 leading-tight">
              <p class="font-medium">Google Calendar</p>
              <p class="text-footnote opacity-50">{{ (google.connected() ? 'settings.googleOn' : 'settings.googleOff') | t }}</p>
            </div>
            <app-toggle [checked]="!!google.connected()" (checkedChange)="setGoogle($event)" [disabled]="google.connected() === null" />
          </div>
        </div>
        @if (failed) {
          <p class="text-footnote text-[var(--danger)] mobile:px-[var(--row-px)]">{{ 'settings.googleError' | t }}</p>
        }
      </div>
    </main>
  `,
})
export class Settings {
  protected readonly google = inject(GoogleCalendarService);
  // Back from Google without a connection
  protected readonly failed = ['error', 'disabled'].includes(inject(ActivatedRoute).snapshot.queryParamMap.get('calendar') ?? '');

  constructor() {
    this.google.reload(); // fresh status (e.g. just back from Google)

    // Mobile toolbar: ‹ and the title.
    const toolbar = inject(ToolbarService);
    const i18n = inject(I18nService);
    toolbar.back.set(true);
    effect(() => toolbar.title.set(i18n.t('nav.settings')));
    inject(DestroyRef).onDestroy(() => {
      toolbar.back.set(false);
      toolbar.title.set('');
    });
  }

  protected setGoogle(on: boolean): void {
    if (on) this.google.connect();
    else this.google.disconnect();
  }
}
