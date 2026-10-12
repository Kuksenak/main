import { Component, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { InstallService } from '../core/services/install.service';
import { UpdateService } from '../core/services/update.service';
import { Icon } from '../core/ui/icon/icon';
import { Sheet } from '../core/ui/sheet/sheet';
import { GoogleCalendarService } from '../schedule/google-calendar.service';
import { IntegrationsSettings, LanguageList, ScheduleSettings } from './sections';

export type SettingsPage = 'language' | 'schedule' | 'integrations';
type Page = SettingsPage;

/**
 * The account button's Settings, like the Claude app's — on phones a sheet from the bottom (drag
 * it down or tap outside to close), on desktop a dropdown under the button (`origin`); no title; the email (5 taps show the version); rows
 * with an icon, the current value and › — each opens its own page right in the sheet (Language,
 * Schedule, Integrations; ‹ back); Install (in the browser), Update when one is ready, Log out.
 * (The pages live in the sheet: nothing can open over it.)
 */
@Component({
  selector: 'app-settings-sheet',
  imports: [Icon, IntegrationsSettings, LanguageList, ScheduleSettings, Sheet, TranslatePipe],
  template: `
    <app-sheet #sheet [origin]="origin()" [wide]="true" [tall]="true" (closed)="closed.emit()">
      <!-- A row's page: ‹ back to the list and its title in the middle (the list itself has no
           title) -->
      @if (page()) {
        <div class="relative mb-3 flex h-10 shrink-0 items-center justify-center">
          <button type="button" (click)="back()" [attr.aria-label]="'action.back' | t" class="absolute left-0 flex size-10 items-center justify-center rounded-full active:opacity-60">
            <app-icon name="chevron-left" class="-ml-1 size-7" />
          </button>
          <span class="text-body font-semibold">{{ title() | t }}</span>
        </div>
      }

      <!-- The list, or a row's own page sliding in over it (back: sliding back) -->
      @switch (page()) {
        @case (null) {
          <div class="flex flex-col gap-6" [class.[animation:paneBack_280ms_var(--ease-out-quick)]]="cameBack">
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
                <button type="button" (click)="open('language')" class="list-row w-full text-left">
                  <app-icon name="globe" class="row-icon" />
                  <span class="flex-1">{{ 'account.language' | t }}</span>
                  <span class="opacity-50">{{ langLabel() }}</span>
                  <app-icon name="chevron-right" class="row-chevron -ml-1" />
                </button>
                <button type="button" (click)="open('schedule')" class="list-row w-full text-left">
                  <app-icon name="calendar" class="row-icon" />
                  <span class="flex-1">{{ 'nav.schedule' | t }}</span>
                  <app-icon name="chevron-right" class="row-chevron" />
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <span class="card-label">{{ 'settings.integrations' | t }}</span>
              <div class="card">
                <button type="button" (click)="open('integrations')" class="list-row w-full text-left">
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
        }
        @case ('language') {
          <div class="[animation:paneIn_280ms_var(--ease-out-quick)]"><app-language-list (picked)="back()" /></div>
        }
        @case ('schedule') {
          <div class="[animation:paneIn_280ms_var(--ease-out-quick)]"><app-schedule-settings /></div>
        }
        @case ('integrations') {
          <div class="[animation:paneIn_280ms_var(--ease-out-quick)]"><app-integrations-settings [failed]="failed()" /></div>
        }
      }
    </app-sheet>
  `,
})
export class SettingsSheet implements OnInit {
  /** Desktop: the account button (the dropdown hangs under it). */
  readonly origin = input<HTMLElement | null>(null);
  /** Open on a page (e.g. Integrations, back from Google) instead of the list. */
  readonly start = input<Page | null>(null);
  /** Back from Google without a connection (why: error / disabled / wrong-account): the error line
   * under Google Calendar. */
  readonly failed = input<string | null>(null);
  readonly closed = output<void>();

  protected readonly auth = inject(AuthStore);
  protected readonly updates = inject(UpdateService);
  protected readonly install = inject(InstallService);
  protected readonly google = inject(GoogleCalendarService);
  private i18n = inject(I18nService);
  private router = inject(Router);
  private readonly sheet = viewChild.required<Sheet>('sheet');

  protected readonly page = signal<Page | null>(null);
  protected cameBack = false; // the list slides back in only after a page, not on opening
  protected readonly title = computed<TranslationKey>(() => {
    const page = this.page();
    return page === 'language' ? 'account.language' : page === 'schedule' ? 'nav.schedule' : 'settings.integrations';
  });

  ngOnInit(): void {
    this.page.set(this.start());
    this.google.reload(); // fresh status (e.g. just back from Google)
  }

  protected open(page: Page): void {
    this.page.set(page);
  }

  protected back(): void {
    this.cameBack = true;
    this.page.set(null);
  }
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
