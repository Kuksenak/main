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
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  // Sections: desktop tabs and both navigation menus.
  protected readonly navItems: { path: string; label: TranslationKey; icon: BrandIconName }[] = [
    { path: '/schedule', label: 'nav.schedule', icon: 'calendar' },
    { path: '/students', label: 'nav.students', icon: 'people' },
    { path: '/about', label: 'nav.about', icon: 'info' },
  ];
  // Plain menu: sections, then About in its own block.
  protected readonly mainNav = this.navItems.filter((i) => i.path !== '/about');
  protected readonly infoNav = this.navItems.filter((i) => i.path === '/about');

  // Which navigation menu is open: tiles, borderless rows with icons, or plain text rows like
  // the account menu (three styles to compare).
  protected readonly navOpen = signal<'tiles' | 'icons' | 'list' | null>(null);
  protected readonly accountOpen = signal(false);
  protected readonly initial = computed(() => (this.auth.email() ?? '?').charAt(0));

  // Hidden version + screen diagnostics: tap the email 5 times.
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
