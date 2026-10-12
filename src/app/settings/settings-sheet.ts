import { Component, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { InstallService } from '../core/services/install.service';
import { UpdateService } from '../core/services/update.service';
import { Icon } from '../core/ui/icon/icon';
import { Sheet } from '../core/ui/sheet/sheet';
import { Toggle } from '../core/ui/toggle';
import { NotificationsService } from '../core/services/notifications.service';
import { GoogleCalendarService } from '../schedule/google-calendar.service';
import { IntegrationsSettings, LanguageList, ScheduleSettings } from './sections';

type Section = 'language' | 'schedule' | 'google';

/**
 * The account button's Settings, like the Claude app's — on phones a sheet from the bottom (drag
 * it down or tap outside to close; a fixed height), on desktop a dropdown under the button
 * (`origin`); no title. The email (5 taps show the version); Language, Schedule and Google
 * Calendar rows — on phones each opens its own page right in the sheet (slides in, ‹ back), on
 * desktop each unfolds its settings under it (one at a time, all folded on opening); back from
 * Google without a connection, Google Calendar's page / settings show the reason; Install (in
 * the browser); Update when one is ready and Log out at the bottom.
 */
@Component({
  selector: 'app-settings-sheet',
  imports: [Icon, IntegrationsSettings, LanguageList, ScheduleSettings, Sheet, Toggle, TranslatePipe],
  template: `
    <app-sheet #sheet [origin]="origin()" [wide]="true" [tall]="true" (closed)="closed.emit()">
      <!-- Phones, a row's page: ‹ back to the list and its title in the middle -->
      @if (page(); as p) {
        <div class="relative mb-3 flex h-[var(--control-round)] shrink-0 items-center justify-center">
          <button type="button" (click)="back()" [attr.aria-label]="'action.back' | t" class="icon-btn absolute left-0">
            <app-icon name="chevron-left" class="-ml-0.5 size-7" />
          </button>
          <span class="text-body font-semibold">{{ titles[p] | t }}</span>
        </div>
        <div class="[animation:paneIn_280ms_var(--ease-out-quick)]">
          @switch (p) {
            @case ('language') { <app-language-list (picked)="back()" /> }
            @case ('schedule') { <app-schedule-settings /> }
            @case ('google') { <app-integrations-settings [failed]="failed()" /> }
          }
        </div>
      } @else {
      <!-- Desktop: compact — no section labels, cards close together -->
      <div class="flex flex-1 flex-col gap-6 desktop:gap-2" [class.[animation:paneBack_280ms_var(--ease-out-quick)]]="cameBack">
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

        <!-- A row: on phones opens its page; on desktop unfolds its settings under it (indented to
             the row's text, › turns down) -->
        <div class="flex flex-col gap-1.5 desktop:gap-0">
          <span class="card-label desktop:hidden">{{ 'settings.general' | t }}</span>
          <div class="card">
            <button type="button" (click)="tap('language')" class="list-row w-full text-left" [attr.aria-expanded]="desktop ? open() === 'language' : null">
              <app-icon name="globe" class="row-icon" />
              <span class="flex-1">{{ 'account.language' | t }}</span>
              <span class="opacity-50">{{ langLabel() }}</span>
              <app-icon name="chevron-right" class="row-chevron -ml-1 transition-transform duration-200" [class.rotate-90]="open() === 'language'" />
            </button>
            @if (desktop && open() === 'language') {
              <app-language-list class="sub-rows" [flat]="true" />
            }
            <button type="button" (click)="tap('schedule')" class="list-row w-full text-left" [attr.aria-expanded]="desktop ? open() === 'schedule' : null">
              <app-icon name="calendar" class="row-icon" />
              <span class="flex-1">{{ 'nav.schedule' | t }}</span>
              <app-icon name="chevron-right" class="row-chevron transition-transform duration-200" [class.rotate-90]="open() === 'schedule'" />
            </button>
            @if (desktop && open() === 'schedule') {
              <app-schedule-settings class="sub-rows" [flat]="true" />
            }
          </div>
        </div>

        <div class="flex flex-col gap-1.5 desktop:gap-0">
          <span class="card-label desktop:hidden">{{ 'settings.integrations' | t }}</span>
          <div class="card">
            <button type="button" (click)="tap('google')" class="list-row w-full text-left" [attr.aria-expanded]="desktop ? open() === 'google' : null">
              <app-icon name="google" class="row-icon !opacity-100" />
              <span class="flex-1">Google Calendar</span>
              <span class="opacity-50">{{ (google.connected() ? 'settings.on' : 'settings.off') | t }}</span>
              <app-icon name="chevron-right" class="row-chevron -ml-1 transition-transform duration-200" [class.rotate-90]="open() === 'google'" />
            </button>
            @if (desktop && open() === 'google') {
              <app-integrations-settings class="sub-rows" [flat]="true" [failed]="failed()" />
            }
          </div>
        </div>

        <!-- Push notifications to this device (e.g. a student finished a lesson) -->
        <div class="flex flex-col gap-1.5">
          <div class="card">
            <div class="list-row">
              <app-icon name="bell" class="row-icon" />
              <span class="flex-1">{{ 'settings.notifications' | t }}</span>
              <app-toggle [checked]="!!notifications.pushOn()" (checkedChange)="setPush($event)" [disabled]="!pushReady()" />
            </div>
          </div>
          <p class="text-footnote px-1 opacity-50 mobile:px-[var(--row-px)]">
            {{ (pushHint() ?? 'settings.notificationsHint') | t }}
          </p>
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

        <!-- At the bottom -->
        <div class="mt-auto flex flex-col gap-3 desktop:gap-2">
          @if (updates.updateReady()) {
            <button type="button" (click)="updates.apply()" class="card-btn text-[var(--accent)]">{{ 'account.update' | t }}</button>
          }
          <button type="button" (click)="auth.logout()" class="card-btn text-[var(--danger)]">{{ 'account.logout' | t }}</button>
        </div>
      </div>
      }
    </app-sheet>
  `,
})
export class SettingsSheet implements OnInit {
  /** Desktop: the account button (the dropdown hangs under it). */
  readonly origin = input<HTMLElement | null>(null);
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

  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  // Desktop: the unfolded row (one at a time; none on opening). Phones: the row's page shown.
  protected readonly open = signal<Section | null>(null);
  protected readonly page = signal<Section | null>(null);
  protected cameBack = false; // the list slides back in only after a page, not on opening
  protected readonly titles: Record<Section, TranslationKey> = {
    language: 'account.language',
    schedule: 'nav.schedule',
    google: 'settings.integrations',
  };

  protected readonly notifications = inject(NotificationsService);
  // Push: the device's state and the server's key known (asked ahead: the permission prompt has
  // to come right in the tap)
  private readonly pushChecked = signal(false);
  protected readonly pushReady = computed(() => this.pushChecked() && this.notifications.pushAvailable && this.notifications.pushConfigured);
  // Why it can't be switched on here, else null (the usual hint)
  protected readonly pushHint = computed<TranslationKey | null>(() => {
    if (!this.pushChecked()) return null;
    if (!this.notifications.pushAvailable) return 'settings.notificationsInstall';
    if (!this.notifications.pushConfigured) return 'settings.notificationsOff';
    if (this.pushDenied()) return 'settings.notificationsDenied';
    return null;
  });
  private readonly pushDenied = signal(false);

  constructor() {
    this.google.reload(); // fresh status (e.g. just back from Google)
    this.notifications.prepare().finally(() => this.pushChecked.set(true));
  }

  protected async setPush(on: boolean): Promise<void> {
    this.pushDenied.set(false);
    if (!on) return this.notifications.disablePush();
    if (!(await this.notifications.enablePush())) this.pushDenied.set(true);
  }

  ngOnInit(): void {
    // Back from Google without a connection: its row unfolded, the reason showing
    if (this.failed()) this.tap('google');
  }

  // A row: its page (phones) or its settings unfolding / folding (desktop).
  protected tap(section: Section): void {
    if (this.desktop) this.open.update((s) => (s === section ? null : section));
    else this.page.set(section);
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
