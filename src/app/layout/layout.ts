import { NgTemplateOutlet } from '@angular/common';
import { LessonImportPreview } from '../lessons/lesson-import-preview';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { TranslationKey } from '../core/i18n/translations';
import { LoadingService } from '../core/services/loading.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { LessonService } from '../lessons/lesson.service';
import { EventService } from '../schedule/event.service';
import { GoogleCalendarService } from '../schedule/google-calendar.service';
import { NotificationsService } from '../core/services/notifications.service';
import { NotificationBanner } from '../core/ui/notification-banner';
import { GroupService } from '../students/group.service';
import { StudentService } from '../students/student.service';
import { UpdateService } from '../core/services/update.service';
import { InstallService } from '../core/services/install.service';
import { StackHost } from '../cards/stack-host';
import { BrandIcon, BrandIconName } from '../core/ui/icon/brand-icon';
import { Icon } from '../core/ui/icon/icon';
import { Sheet } from '../core/ui/sheet/sheet';
import { SettingsSheet } from '../settings/settings-sheet';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, Sheet, Icon, BrandIcon, LessonImportPreview, NotificationBanner, SettingsSheet, StackHost, TranslatePipe],
  templateUrl: './layout.html',
})
export class Layout {
  protected readonly auth = inject(AuthStore);
  protected readonly loading = inject(LoadingService);
  protected readonly updates = inject(UpdateService);
  protected readonly toolbar = inject(ToolbarService);
  protected readonly install = inject(InstallService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationsService);

  constructor() {
    // The signed-in account's data, loaded once for every page and card.
    inject(EventService).ensureLoaded();
    inject(StudentService).ensureLoaded();
    inject(GroupService).ensureLoaded();
    inject(LessonService).ensureLoaded();
    inject(GoogleCalendarService).ensureLoaded();
    this.notifications.start(); // live notifications (e.g. a student finished a lesson)

    // Back from Google's consent screen (the API returns to the app's root with
    // ?calendar=connected / error / disabled / wrong-account): Settings open, where it was switched
    // on (the error line if it didn't connect); the query is dropped from the address.
    const calendar = new URLSearchParams(location.search).get('calendar');
    if (calendar) {
      this.settingsFailed = calendar === 'connected' ? null : calendar;
      this.accountOpen.set(true);
      setTimeout(() => this.router.navigate([], { queryParams: {}, replaceUrl: true }));
    }
  }

  // Sections: desktop tabs and the navigation menu.
  protected readonly navItems: { path: string; label: TranslationKey; icon: BrandIconName }[] = [
    { path: '/schedule', label: 'nav.schedule', icon: 'calendar' },
    { path: '/students', label: 'nav.students', icon: 'people' },
    { path: '/lessons', label: 'nav.lessons', icon: 'book' },
  ];
  protected readonly menuOpen = signal(false);

  // Pages menu: the global loading bar at the bottom runs while the tapped page opens; the menu
  // closes once the page is there (at least a short moment, so the bar is seen).
  protected readonly opening = signal<string | null>(null);

  protected goFromMenu(path: string, sheet: Sheet): void {
    if (this.opening()) return;
    if (this.isActive(path)) {
      sheet.close();
      return;
    }
    this.opening.set(path);
    this.loading.begin();
    const shown = new Promise((r) => setTimeout(r, 450));
    Promise.all([this.router.navigateByUrl(path), shown]).finally(() => {
      sheet.close();
      this.loading.end();
      setTimeout(() => this.opening.set(null), 400);
    });
  }
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly i18n = inject(I18nService);

  protected readonly accountOpen = signal(false);
  // Settings opened by the app itself (back from Google): why it didn't connect, if it didn't
  protected settingsFailed: string | null = null;
  protected readonly initial = computed(() => (this.auth.email() ?? '?').charAt(0));
  // Desktop account button: the user's name, else the email.
  protected readonly userName = computed(() => this.auth.name() ?? this.auth.email() ?? '');


  protected isActive(path: string): boolean {
    return this.router.isActive(path, {
      paths: 'subset',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  // Close the menu first and switch pages once it's mostly gone — doing both at once made the
  // sheet's slide stutter.
  protected go(path: string, sheet: Sheet): void {
    sheet.close();
    setTimeout(() => this.router.navigateByUrl(path), 300);
  }

  // Toolbar ‹: the previous page, or Schedule when the app was opened right here.
  protected back(): void {
    if (history.length > 1) history.back();
    else this.router.navigateByUrl('/schedule');
  }

  // Logging out leaves the app (AuthStore redirects to /login and this layout un-renders).
  protected logout(): void {
    this.auth.logout();
  }
}
