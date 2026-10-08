import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { LoadingService } from '../core/services/loading.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { UpdateService } from '../core/services/update.service';
import { Icon } from '../core/ui/icon/icon';
import { Sheet } from '../core/ui/sheet/sheet';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Sheet, Icon, TranslatePipe],
  templateUrl: './layout.html',
})
export class Layout {
  protected readonly auth = inject(AuthStore);
  protected readonly loading = inject(LoadingService);
  protected readonly updates = inject(UpdateService);
  protected readonly toolbar = inject(ToolbarService);
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  protected readonly navItems: { path: string; label: TranslationKey }[] = [
    { path: '/schedule', label: 'nav.schedule' },
    { path: '/about', label: 'nav.about' },
  ];

  protected readonly navOpen = signal(false);
  protected readonly accountOpen = signal(false);
  protected readonly initial = computed(() => (this.auth.email() ?? '?').charAt(0));

  protected isActive(path: string): boolean {
    return this.router.isActive(path, {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  protected go(path: string, sheet: Sheet): void {
    sheet.close();
    this.router.navigateByUrl(path);
  }

  // Logging out leaves the app (AuthStore redirects to /login and this layout un-renders).
  protected logout(): void {
    this.auth.logout();
  }
}
