import { Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { InstallService } from '../core/services/install.service';
import { UpdateService } from '../core/services/update.service';
import { Icon } from '../core/ui/icon/icon';
import { Sheet } from '../core/ui/sheet/sheet';
import { GoogleCalendarService } from '../schedule/google-calendar.service';
import { IntegrationsSettings, LanguageList, ScheduleSettings } from './sections';

type Section = 'language' | 'schedule';

/**
 * The account button's Settings, like the Claude app's — on phones a sheet from the bottom (drag
 * it down or tap outside to close), on desktop a dropdown under the button (`origin`); no title.
 * The email (5 taps show the version); Language and Schedule rows unfold their settings right
 * under them (one at a time, all folded on opening); Google Calendar with its switch; Install (in
 * the browser); Update when one is ready and Log out at the bottom.
 */
@Component({
  selector: 'app-settings-sheet',
  imports: [Icon, IntegrationsSettings, LanguageList, ScheduleSettings, Sheet, TranslatePipe],
  template: `
    <app-sheet #sheet [origin]="origin()" [wide]="true" [tall]="true" (closed)="closed.emit()">
      <!-- Desktop: compact — no section labels, cards close together -->
      <div class="flex flex-1 flex-col gap-6 desktop:gap-2">
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

        <!-- A row unfolds its settings under it (indented to the row's text); › turns down -->
        <div class="flex flex-col gap-1.5 desktop:gap-0">
          <span class="card-label desktop:hidden">{{ 'settings.general' | t }}</span>
          <div class="card">
            <button type="button" (click)="toggle('language')" class="list-row w-full text-left" [attr.aria-expanded]="open() === 'language'">
              <app-icon name="globe" class="row-icon" />
              <span class="flex-1">{{ 'account.language' | t }}</span>
              <span class="opacity-50">{{ langLabel() }}</span>
              <app-icon name="chevron-right" class="row-chevron -ml-1 transition-transform duration-200" [class.rotate-90]="open() === 'language'" />
            </button>
            @if (open() === 'language') {
              <app-language-list class="sub-rows" [flat]="true" />
            }
            <button type="button" (click)="toggle('schedule')" class="list-row w-full text-left" [attr.aria-expanded]="open() === 'schedule'">
              <app-icon name="calendar" class="row-icon" />
              <span class="flex-1">{{ 'nav.schedule' | t }}</span>
              <app-icon name="chevron-right" class="row-chevron transition-transform duration-200" [class.rotate-90]="open() === 'schedule'" />
            </button>
            @if (open() === 'schedule') {
              <app-schedule-settings class="sub-rows" [flat]="true" />
            }
          </div>
        </div>

        <div class="flex flex-col gap-1.5 desktop:gap-0">
          <span class="card-label desktop:hidden">{{ 'settings.integrations' | t }}</span>
          <app-integrations-settings [failed]="failed()" />
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
    </app-sheet>
  `,
})
export class SettingsSheet {
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

  // The unfolded row (one at a time; none on opening)
  protected readonly open = signal<Section | null>(null);

  constructor() {
    this.google.reload(); // fresh status (e.g. just back from Google)
  }

  protected toggle(section: Section): void {
    this.open.update((s) => (s === section ? null : section));
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
