import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { LanguageCode, TranslationKey } from '../core/i18n/translations';
import { NotificationsService } from '../core/services/notifications.service';
import { Icon } from '../core/ui/icon/icon';
import { SelectField, SelectOption } from '../core/ui/select/select';
import { TimeField } from '../core/ui/time/time';
import { Toggle } from '../core/ui/toggle';
import { GoogleCalendarService } from '../schedule/google-calendar.service';
import { EVENT_LENGTHS, PreferencesService } from './preferences.service';

// The pieces of Settings, shared by the desktop page and the phones' Settings sheet.

/** Schedule: a new event's length and the hour new events on other days start at (a card; `flat`:
 * just the rows, inside another card). */
@Component({
  selector: 'app-schedule-settings',
  imports: [FormsModule, SelectField, TimeField, TranslatePipe],
  // block: a component's element is inline otherwise (no card drawn)
  host: { class: 'block', '[class.card]': '!flat()' },
  template: `
    <div class="list-row">
      <span>{{ 'settings.eventLength' | t }}</span>
      <app-select class="ml-auto" stretch [options]="lengthOptions()" [ngModel]="prefs.eventMinutes()" (ngModelChange)="prefs.eventMinutes.set(+$event)" [ngModelOptions]="{ standalone: true }" />
    </div>
    <div class="list-row">
      <span>{{ 'settings.dayStart' | t }}</span>
      <app-time class="ml-auto" [ngModel]="prefs.dayStart()" (ngModelChange)="$event && prefs.dayStart.set($event)" [ngModelOptions]="{ standalone: true }" />
    </div>
  `,
})
export class ScheduleSettings {
  readonly flat = input(false);
  protected readonly prefs = inject(PreferencesService);
  private i18n = inject(I18nService);
  protected readonly lengthOptions = computed<SelectOption[]>(() =>
    EVENT_LENGTHS.map((n) => ({ value: n, label: `${n} ${this.i18n.t('settings.minutes')}` })),
  );
}

/**
 * Integrations: Google Calendar (its events in the schedule) — on goes through Google's consent
 * screen and comes back (?calendar=connected / error / disabled / wrong-account), off
 * disconnects. `failed`: back from Google without a connection — why (an error line under the
 * card; another Google account than the signed-in one gets its own). `flat`: just the switch's
 * row (and the error as a row), unfolded under a "Google Calendar" row.
 */
@Component({
  selector: 'app-integrations-settings',
  imports: [Icon, Toggle, TranslatePipe],
  host: { class: 'flex flex-col', '[class.gap-[6px]]': '!flat()' },
  template: `
    @if (flat()) {
      <div class="list-row">
        <span class="flex-1">{{ 'settings.googleOff' | t }}</span>
        <app-toggle [(checked)]="on" (checkedChange)="setGoogle($event)" [disabled]="google.connected() === null" />
      </div>
      @if (error(); as e) {
        <p class="list-row text-footnote text-[var(--danger)]">{{ (e === 'wrong-account' ? 'settings.googleWrongAccount' : 'settings.googleError') | t }}</p>
      }
    } @else {
    <div class="card">
      <div class="list-row py-2.5">
        <app-icon name="google" class="size-6 shrink-0" />
        <div class="min-w-0 flex-1 leading-tight">
          <p class="font-medium">Google Calendar</p>
          <p class="text-footnote opacity-50">{{ (google.connected() ? 'settings.googleOn' : 'settings.googleOff') | t }}</p>
        </div>
        <app-toggle [(checked)]="on" (checkedChange)="setGoogle($event)" [disabled]="google.connected() === null" />
      </div>
    </div>
    @if (error(); as e) {
      <p class="text-footnote text-[var(--danger)] mobile:px-[var(--row-px)]">{{ (e === 'wrong-account' ? 'settings.googleWrongAccount' : 'settings.googleError') | t }}</p>
    }
    }
  `,
})
export class IntegrationsSettings {
  // Why it didn't connect, back from Google (null: it did / nothing tried)
  readonly failed = input<string | null>(null);
  readonly flat = input(false);
  protected readonly google = inject(GoogleCalendarService);
  private readonly connectFailed = signal(false);
  protected readonly error = computed(() => (this.connectFailed() ? 'error' : this.failed()));
  // The switch: follows the connection; back off when connecting fails right away
  protected readonly on = linkedSignal(() => !!this.google.connected());

  protected setGoogle(on: boolean): void {
    this.connectFailed.set(false);
    if (on)
      this.google.connect(() => {
        this.connectFailed.set(true);
        this.on.set(false);
      });
    else this.google.disconnect();
  }
}

/** The languages, the current one checked (a card; `flat`: just the rows); `picked` after a tap
 * switches it. */
@Component({
  selector: 'app-language-list',
  imports: [Icon],
  host: { class: 'block', '[class.card]': '!flat()' },
  template: `
    @for (lang of i18n.languages; track lang.code) {
      <button type="button" (click)="pick(lang.code)" class="list-row w-full text-left">
        <span class="flex-1">{{ lang.label }}</span>
        @if (i18n.lang() === lang.code) {
          <app-icon name="check" class="size-5 text-[var(--accent)]" />
        }
      </button>
    }
  `,
})
export class LanguageList {
  readonly flat = input(false);
  readonly picked = output<void>();
  protected readonly i18n = inject(I18nService);

  protected pick(code: LanguageCode): void {
    this.i18n.setLang(code);
    this.picked.emit();
  }
}

/**
 * Notifications: this device's push switch (with why it can't be switched on here, else what it's
 * for) and "All notifications ›" (`openList`: the page with them). A card; `flat`: just the rows,
 * unfolded under the Notifications row.
 */
@Component({
  selector: 'app-notification-settings',
  imports: [Icon, Toggle, TranslatePipe],
  host: { class: 'flex flex-col', '[class.gap-[6px]]': '!flat()' },
  template: `
    <div [class.card]="!flat()">
      <div class="list-row">
        <span class="flex-1">{{ 'settings.pushThisDevice' | t }}</span>
        <app-toggle [checked]="!!notifications.pushOn()" (checkedChange)="setPush($event)" [disabled]="!pushReady()" />
      </div>
      @if (flat()) {
        <p class="list-row text-footnote opacity-50">{{ (pushHint() ?? 'settings.notificationsHint') | t }}</p>
      }
      <button type="button" (click)="openList.emit()" class="list-row w-full text-left">
        <span class="flex-1">{{ 'settings.allNotifications' | t }}</span>
        <app-icon name="chevron-right" class="row-chevron" />
      </button>
    </div>
    @if (!flat()) {
      <p class="text-footnote px-1 opacity-50 mobile:px-[var(--row-px)]">{{ (pushHint() ?? 'settings.notificationsHint') | t }}</p>
    }
  `,
})
export class NotificationSettings {
  readonly flat = input(false);
  readonly openList = output<void>();

  protected readonly notifications = inject(NotificationsService);
  // The device's state and the server's key, asked ahead (the permission prompt has to come right
  // in the tap)
  private readonly checked = signal(false);
  private readonly denied = signal(false);
  protected readonly pushReady = computed(() => this.checked() && this.notifications.pushAvailable && this.notifications.pushConfigured);
  // Why it can't be switched on here, else null (the usual hint)
  protected readonly pushHint = computed<TranslationKey | null>(() => {
    if (!this.checked()) return null;
    if (!this.notifications.pushAvailable) return 'settings.notificationsInstall';
    if (!this.notifications.pushConfigured) return 'settings.notificationsOff';
    if (this.denied()) return 'settings.notificationsDenied';
    return null;
  });

  constructor() {
    this.notifications.prepare().finally(() => this.checked.set(true));
  }

  protected async setPush(on: boolean): Promise<void> {
    this.denied.set(false);
    if (!on) return this.notifications.disablePush();
    if (!(await this.notifications.enablePush())) this.denied.set(true);
  }
}
