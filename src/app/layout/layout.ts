import { NgTemplateOutlet } from '@angular/common';
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
import { GroupService } from '../students/group.service';
import { StudentService } from '../students/student.service';
import { UpdateService } from '../core/services/update.service';
import { StackHost } from '../cards/stack-host';
import { BrandIcon, BrandIconName } from '../core/ui/icon/brand-icon';
import { Icon } from '../core/ui/icon/icon';
import { Sheet } from '../core/ui/sheet/sheet';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, Sheet, Icon, BrandIcon, StackHost, TranslatePipe],
  templateUrl: './layout.html',
})
export class Layout {
  protected readonly auth = inject(AuthStore);
  protected readonly loading = inject(LoadingService);
  protected readonly updates = inject(UpdateService);
  protected readonly toolbar = inject(ToolbarService);
  private readonly router = inject(Router);

  constructor() {
    // The signed-in account's data, loaded once for every page and card.
    inject(EventService).ensureLoaded();
    inject(StudentService).ensureLoaded();
    inject(GroupService).ensureLoaded();
    inject(LessonService).ensureLoaded();
  }

  // Sections: desktop tabs and the navigation menu.
  protected readonly navItems: { path: string; label: TranslationKey; icon: BrandIconName }[] = [
    { path: '/schedule', label: 'nav.schedule', icon: 'calendar' },
    { path: '/students', label: 'nav.students', icon: 'people' },
    { path: '/lessons', label: 'nav.lessons', icon: 'book' },
  ];
  // Under the account button.
  protected readonly accountItems: { path: string; label: TranslationKey; icon?: BrandIconName }[] = [
    { path: '/about', label: 'nav.about' },
  ];
  // The pages menu, open under the menu button (its place on screen), or null.
  protected readonly menuOpen = signal<{ top: number; right: number } | null>(null);

  protected openMenu(button: HTMLElement): void {
    const r = button.getBoundingClientRect();
    this.menuOpen.set({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
  }

  protected goTo(path: string): void {
    this.menuOpen.set(null);
    this.router.navigateByUrl(path);
  }
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly i18n = inject(I18nService);

  protected readonly accountOpen = signal(false);
  protected readonly initial = computed(() => (this.auth.email() ?? '?').charAt(0));
  // Desktop account button: the user's name, else the email.
  protected readonly userName = computed(() => this.auth.name() ?? this.auth.email() ?? '');

  // Hidden app version: tap the email 5 times (again to hide).
  protected readonly showVersion = signal(false);
  private versionTaps = 0;

  protected versionTap(): void {
    if (++this.versionTaps < 5) return;
    this.versionTaps = 0;
    this.showVersion.update((v) => !v);
  }

  protected isActive(path: string): boolean {
    return this.router.isActive(path, {
      paths: 'subset',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  protected go(path: string, sheet: Sheet): void {
    sheet.close();
    this.router.navigateByUrl(path);
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
