import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { LoadingService } from '../core/services/loading.service';
import { UpdateService } from '../core/services/update.service';
import { Sheet } from '../core/ui/sheet/sheet';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Sheet],
  templateUrl: './layout.html',
})
export class Layout {
  protected readonly auth = inject(AuthStore);
  protected readonly loading = inject(LoadingService);
  protected readonly updates = inject(UpdateService);
  private readonly router = inject(Router);

  protected readonly navItems = [
    { path: '/schedule', label: 'Schedule' },
    { path: '/about', label: 'About' },
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

  protected logout(sheet: Sheet): void {
    sheet.close();
    this.auth.logout();
  }
}
