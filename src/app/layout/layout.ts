import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { LoadingService } from '../core/services/loading.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { UpdateService } from '../core/services/update.service';
import { StackHost } from '../cards/stack-host';
import { Icon, IconName } from '../core/ui/icon/icon';
import { Sheet } from '../core/ui/sheet/sheet';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, Sheet, Icon, StackHost, TranslatePipe],
  templateUrl: './layout.html',
})
export class Layout {
  protected readonly auth = inject(AuthStore);
  protected readonly loading = inject(LoadingService);
  protected readonly updates = inject(UpdateService);
  protected readonly toolbar = inject(ToolbarService);
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  // Sections: desktop tabs and the mobile launcher tiles (icon on a colored circle).
  protected readonly navItems: { path: string; label: TranslationKey; icon: IconName; color: string }[] = [
    { path: '/schedule', label: 'nav.schedule', icon: 'calendar', color: 'var(--accent)' },
    { path: '/students', label: 'nav.students', icon: 'people', color: 'var(--palette-teal)' },
    { path: '/about', label: 'nav.about', icon: 'info', color: 'var(--palette-purple)' },
  ];

  protected readonly navOpen = signal(false);
  protected readonly accountOpen = signal(false);
  protected readonly initial = computed(() => (this.auth.email() ?? '?').charAt(0));

  // Hidden screen diagnostics: tap Version 5 times.
  protected readonly diagnostics = signal<string | null>(null);
  private versionTaps = 0;

  protected versionTap(): void {
    if (++this.versionTaps < 5) return;
    this.versionTaps = 0;
    if (this.diagnostics()) return this.diagnostics.set(null);
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;top:0;height:100dvh;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);visibility:hidden';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const vv = window.visualViewport;
    const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
    this.diagnostics.set(
      [
        `inner ${innerWidth}×${innerHeight}`,
        `vv ${vv ? `${Math.round(vv.width)}×${Math.round(vv.height)} @${Math.round(vv.offsetTop)}` : '—'}`,
        `screen ${screen.width}×${screen.height}`,
        `dvh ${probe.offsetHeight}`,
        `body ${document.body.offsetHeight}`,
        `safe ${cs.paddingTop}/${cs.paddingBottom}`,
        `${standalone ? 'standalone' : 'browser'} dpr ${devicePixelRatio}`,
      ].join(' · '),
    );
    probe.remove();
  }

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
