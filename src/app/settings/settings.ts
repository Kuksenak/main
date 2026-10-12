import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@environments/environment';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { LanguageCode } from '../core/i18n/translations';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { SelectField, SelectOption } from '../core/ui/select/select';
import { Toggle } from '../core/ui/toggle';
import { GoogleCalendarService } from '../schedule/google-calendar.service';
import { IntegrationsSettings, LanguageList, ScheduleSettings } from './sections';

/**
 * Settings, opened from the account menu (desktop; phones have SettingsSheet, but a link back
 * from Google lands here): grouped like iOS Settings (a label over each card). General: the
 * language (desktop: a dropdown; phones: its own page). Schedule: a new event's length and the
 * hour new events start at.
 * Integrations: Google Calendar (its events in the schedule) — on goes through Google's consent
 * screen and comes back here (?calendar=connected / error / disabled), off disconnects.
 * About: the version. (The theme follows the system.)
 */
@Component({
  selector: 'app-settings',
  imports: [FormsModule, Icon, IntegrationsSettings, LanguageList, PageSheet, ScheduleSettings, SelectField, Toggle, TranslatePipe],
  template: `
    <main class="flex w-full flex-1 flex-col gap-5 px-4 pb-8 pt-1 desktop:max-w-xl">
      <!-- General -->
      <div class="flex flex-col gap-1.5">
        <span class="card-label">{{ 'settings.general' | t }}</span>
        <div class="card">
          @if (desktop) {
            <div class="list-row">
              <span>{{ 'account.language' | t }}</span>
              <app-select class="ml-auto" stretch [options]="languageOptions" [ngModel]="i18n.lang()" (ngModelChange)="setLang($event)" [ngModelOptions]="{ standalone: true }" />
            </div>
          } @else {
            <!-- Phones: the current one, › opens the list on its own page -->
            <button type="button" (click)="choosingLang.set(true)" class="list-row w-full text-left">
              <span class="flex-1">{{ 'account.language' | t }}</span>
              <span class="opacity-50">{{ langLabel() }}</span>
              <app-icon name="chevron-right" class="row-chevron -ml-1" />
            </button>
          }
        </div>
      </div>

      <!-- Schedule -->
      <div class="flex flex-col gap-1.5">
        <span class="card-label">{{ 'nav.schedule' | t }}</span>
        <app-schedule-settings />
      </div>

      <!-- Integrations -->
      <div class="flex flex-col gap-1.5">
        <span class="card-label">{{ 'settings.integrations' | t }}</span>
        <app-integrations-settings [failed]="failed" />
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

    <!-- Phones: the languages, the current one checked; a tap switches and goes back -->
    @if (choosingLang()) {
      <app-page-sheet #langPage [title]="'account.language' | t" [actions]="false" (closed)="choosingLang.set(false)">
        <app-language-list (picked)="langPage.close()" />
      </app-page-sheet>
    }
  `,
})
export class Settings {
  protected readonly i18n = inject(I18nService);
  protected readonly version = environment.version;
  protected readonly testSwitch = signal(false); // TEMPORARY (see the template)
  // Back from Google without a connection
  protected readonly failed = ['error', 'disabled'].includes(inject(ActivatedRoute).snapshot.queryParamMap.get('calendar') ?? '');

  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly choosingLang = signal(false);
  protected readonly langLabel = computed(() => this.i18n.languages.find((l) => l.code === this.i18n.lang())?.label ?? '');
  protected readonly languageOptions: SelectOption[] = this.i18n.languages.map((l) => ({ value: l.code, label: l.label }));

  constructor() {
    inject(GoogleCalendarService).reload(); // fresh status (e.g. just back from Google)

    // Mobile toolbar: just ‹ (no title).
    const toolbar = inject(ToolbarService);
    toolbar.back.set(true);
    inject(DestroyRef).onDestroy(() => toolbar.back.set(false));
  }

  protected setLang(code: string): void {
    this.i18n.setLang(code as LanguageCode);
  }
}
