import { Component, computed, inject, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { InstallService } from '../core/services/install.service';
import { UpdateService } from '../core/services/update.service';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { GoogleCalendarService } from '../schedule/google-calendar.service';
import { IntegrationsSettings, LanguageList, ScheduleSettings } from './sections';

type Page = 'language' | 'schedule' | 'integrations';

/**
 * Phones: the account button's Settings, like the Claude app's: ✕ and the title; the email (5 taps
 * show the version); rows with an icon, the current value and › — each opens its own page
 * (Language, Schedule, Integrations); Install (in the browser), Update when one is ready, Log out.
 */
@Component({
  selector: 'app-settings-sheet',
  imports: [Icon, IntegrationsSettings, LanguageList, PageSheet, ScheduleSettings, TranslatePipe],
  template: `
    <app-page-sheet #sheet [title]="'nav.settings' | t" [actions]="false" [closeIcon]="true" (closed)="closed.emit()">
      <div class="flex flex-col gap-6">
        <div class="card">
          <!-- 5 taps on the email show the app version (hidden; for support) -->
          <button type="button" (click)="versionTap()" class="list-row w-full text-left">
            <app-icon name="person" class="row-icon" />
            <span class="min-w-0 flex-1 truncate">{{ auth.email() }}</span>
          </button>
          @if (showVersion()) {
            <div class="list-row text-footnote tabular-nums opacity-50">{{ updates.version }}</div>
          }
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="card-label">{{ 'settings.general' | t }}</span>
          <div class="card">
            <button type="button" (click)="page.set('language')" class="list-row w-full text-left">
              <app-icon name="globe" class="row-icon" />
              <span class="flex-1">{{ 'account.language' | t }}</span>
              <span class="opacity-50">{{ langLabel() }}</span>
              <app-icon name="chevron-right" class="row-chevron -ml-1" />
            </button>
            <button type="button" (click)="page.set('schedule')" class="list-row w-full text-left">
              <app-icon name="calendar" class="row-icon" />
              <span class="flex-1">{{ 'nav.schedule' | t }}</span>
              <app-icon name="chevron-right" class="row-chevron" />
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="card-label">{{ 'settings.integrations' | t }}</span>
          <div class="card">
            <button type="button" (click)="page.set('integrations')" class="list-row w-full text-left">
              <app-icon name="google" class="row-icon" />
              <span class="flex-1">Google Calendar</span>
              <span class="opacity-50">{{ (google.connected() ? 'settings.on' : 'settings.off') | t }}</span>
              <app-icon name="chevron-right" class="row-chevron -ml-1" />
            </button>
          </div>
        </div>

        @if (!install.standalone) {
          <div class="card">
            <button type="button" (click)="go('/install')" class="list-row w-full text-left">
              <app-icon name="install" class="row-icon" />
              <span class="flex-1">{{ 'nav.install' | t }}</span>
              <app-icon name="chevron-right" class="row-chevron" />
            </button>
          </div>
        }

        <div class="flex flex-col gap-3">
          @if (updates.updateReady()) {
            <button type="button" (click)="updates.apply()" class="card-btn text-[var(--accent)]">{{ 'account.update' | t }}</button>
          }
          <button type="button" (click)="auth.logout()" class="card-btn text-[var(--danger)]">{{ 'account.logout' | t }}</button>
        </div>
      </div>
    </app-page-sheet>

    <!-- A row's own page, over the Settings -->
    @switch (page()) {
      @case ('language') {
        <app-page-sheet #sub [title]="'account.language' | t" [actions]="false" (closed)="page.set(null)">
          <app-language-list (picked)="sub.close()" />
        </app-page-sheet>
      }
      @case ('schedule') {
        <app-page-sheet [title]="'nav.schedule' | t" [actions]="false" (closed)="page.set(null)">
          <app-schedule-settings />
        </app-page-sheet>
      }
      @case ('integrations') {
        <app-page-sheet [title]="'settings.integrations' | t" [actions]="false" (closed)="page.set(null)">
          <app-integrations-settings />
        </app-page-sheet>
      }
    }
  `,
})
export class SettingsSheet {
  readonly closed = output<void>();

  protected readonly auth = inject(AuthStore);
  protected readonly updates = inject(UpdateService);
  protected readonly install = inject(InstallService);
  protected readonly google = inject(GoogleCalendarService);
  private i18n = inject(I18nService);
  private router = inject(Router);
  private readonly sheet = viewChild.required<PageSheet>('sheet');

  protected readonly page = signal<Page | null>(null);
  protected readonly langLabel = computed(() => this.i18n.languages.find((l) => l.code === this.i18n.lang())?.label ?? '');

  // Hidden app version: tap the email 5 times (again to hide).
  protected readonly showVersion = signal(false);
  private versionTaps = 0;
  protected versionTap(): void {
    if (++this.versionTaps < 5) return;
    this.versionTaps = 0;
    this.showVersion.update((v) => !v);
  }

  // A page of the app (Install): Settings closes, then it opens.
  protected go(path: string): void {
    this.sheet().close();
    setTimeout(() => this.router.navigateByUrl(path), 250);
  }
}
