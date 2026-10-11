import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@environments/environment';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { LanguageCode } from '../core/i18n/translations';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { SelectField, SelectOption } from '../core/ui/select/select';
import { TimeField } from '../core/ui/time/time';
import { Toggle } from '../core/ui/toggle';
import { GoogleCalendarService } from '../schedule/google-calendar.service';
import { EVENT_LENGTHS, PreferencesService } from './preferences.service';

/**
 * Settings, opened from the account menu: grouped like iOS Settings (a label over each card).
 * General: the language. Schedule: a new event's length and the hour new events start at.
 * Integrations: Google Calendar (its events in the schedule) — on goes through Google's consent
 * screen and comes back here (?calendar=connected / error / disabled), off disconnects.
 * About: the version. (The theme follows the system.)
 */
@Component({
  selector: 'app-settings',
  imports: [FormsModule, Icon, SelectField, TimeField, Toggle, TranslatePipe],
  template: `
    <main class="flex w-full flex-1 flex-col gap-5 px-4 pb-8 pt-1 desktop:max-w-xl">
      <!-- General -->
      <div class="flex flex-col gap-1.5">
        <span class="card-label">{{ 'settings.general' | t }}</span>
        <div class="card">
          <div class="list-row">
            <span>{{ 'account.language' | t }}</span>
            <app-select class="ml-auto" stretch [options]="languageOptions" [ngModel]="i18n.lang()" (ngModelChange)="setLang($event)" [ngModelOptions]="{ standalone: true }" />
          </div>
        </div>
      </div>

      <!-- Schedule -->
      <div class="flex flex-col gap-1.5">
        <span class="card-label">{{ 'nav.schedule' | t }}</span>
        <div class="card">
          <div class="list-row">
            <span>{{ 'settings.eventLength' | t }}</span>
            <app-select class="ml-auto" stretch [options]="lengthOptions()" [ngModel]="prefs.eventMinutes()" (ngModelChange)="prefs.eventMinutes.set(+$event)" [ngModelOptions]="{ standalone: true }" />
          </div>
          <div class="list-row">
            <span>{{ 'settings.dayStart' | t }}</span>
            <app-time class="ml-auto" [ngModel]="prefs.dayStart()" (ngModelChange)="$event && prefs.dayStart.set($event)" [ngModelOptions]="{ standalone: true }" />
          </div>
        </div>
      </div>

      <!-- Integrations -->
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

      <!-- About -->
      <div class="flex flex-col gap-1.5">
        <span class="card-label">{{ 'nav.about' | t }}</span>
        <div class="card">
          <div class="list-row">
            <span>{{ 'settings.version' | t }}</span>
            <span class="ml-auto tabular-nums opacity-50">{{ version }}</span>
          </div>
        </div>
      </div>

      <!-- TEMPORARY: a switch that does nothing, to try the toggle -->
      <div class="card">
        <div class="list-row">
          <span class="flex-1">Test switch</span>
          <app-toggle [(checked)]="testSwitch" />
        </div>
      </div>
    </main>
  `,
})
export class Settings {
  protected readonly google = inject(GoogleCalendarService);
  protected readonly prefs = inject(PreferencesService);
  protected readonly i18n = inject(I18nService);
  protected readonly version = environment.version;
  protected readonly testSwitch = signal(false); // TEMPORARY (see the template)
  // Back from Google without a connection
  protected readonly failed = ['error', 'disabled'].includes(inject(ActivatedRoute).snapshot.queryParamMap.get('calendar') ?? '');

  protected readonly languageOptions: SelectOption[] = this.i18n.languages.map((l) => ({ value: l.code, label: l.label }));
  protected readonly lengthOptions = computed<SelectOption[]>(() =>
    EVENT_LENGTHS.map((n) => ({ value: n, label: `${n} ${this.i18n.t('settings.minutes')}` })),
  );

  constructor() {
    this.google.reload(); // fresh status (e.g. just back from Google)

    // Mobile toolbar: just ‹ (no title).
    const toolbar = inject(ToolbarService);
    toolbar.back.set(true);
    inject(DestroyRef).onDestroy(() => toolbar.back.set(false));
  }

  protected setLang(code: string): void {
    this.i18n.setLang(code as LanguageCode);
  }

  protected setGoogle(on: boolean): void {
    if (on) this.google.connect();
    else this.google.disconnect();
  }
}
