import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { AREA_LABELS, AREAS, Area, LEVEL_LABELS, LEVELS, Level } from '../auth/permissions';
import { desktop } from '../core/device';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiCard, UiListRow, UiSegment, UiSegmented } from '../core/ui';
import { PageTitle } from '../layout/page-title';

interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  lastSignInAt: string;
  isAdmin: boolean;
  permissions: Partial<Record<Area, Level>>;
}

interface AdminUsers {
  areas: string[];
  users: AdminUser[];
}

/**
 * The admin page (the admins only: adminGuard): everyone who has signed in, latest first — the
 * name, the email, the last sign-in — and per area their level (none / read / write), saved as soon
 * as it's picked (back as it was if that fails). The admins: write everywhere, locked.
 * Desktop: a table, a column per area; phones: a card per user.
 */
@Component({
  selector: 'app-admin',
  imports: [TranslatePipe, UiCard, UiListRow, UiSegmented],
  templateUrl: './admin.html',
})
export class Admin {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly url = `${environment.apiUrl}/admin/users`;

  protected readonly desktop = desktop;
  protected readonly areaLabels = AREA_LABELS;

  protected readonly users = signal<AdminUser[] | null>(null);
  // (the areas the server sends that this app knows: their names are here)
  protected readonly areas = signal<Area[]>([]);
  protected readonly loadError = signal(false);
  protected readonly saveError = signal(false);

  protected readonly levels = computed<UiSegment<Level>[]>(() =>
    LEVELS.map((level) => ({ value: level, label: this.i18n.t(LEVEL_LABELS[level]) })),
  );

  constructor() {
    inject(PageTitle).show(computed(() => this.i18n.t('admin.title')));
    this.http.get<AdminUsers>(this.url).subscribe({
      next: (res) => {
        this.areas.set(AREAS.filter((a) => res.areas.includes(a)));
        this.users.set(res.users);
      },
      error: () => this.loadError.set(true),
    });
  }

  protected name(user: AdminUser): string | null {
    return [user.firstName, user.lastName].filter((p) => !!p?.trim()).join(' ') || null;
  }

  protected lastSignIn(user: AdminUser): string {
    return this.i18n.date(new Date(user.lastSignInAt), { dateStyle: 'medium', timeStyle: 'short' });
  }

  protected level(user: AdminUser, area: Area): Level {
    return user.isAdmin ? 'write' : (user.permissions[area] ?? 'none');
  }

  /** A level picked: shown at once, saved; if that fails, back as it was. */
  protected set(user: AdminUser, area: Area, level: Level | undefined): void {
    if (!level || user.isAdmin || this.level(user, area) === level) return;
    const before = user.permissions;
    this.saveError.set(false);
    this.update(user.id, { ...before, [area]: level });
    this.http.put<AdminUser>(`${this.url}/${user.id}/permissions`, { [area]: level }).subscribe({
      next: (saved) => this.update(user.id, saved.permissions),
      error: () => {
        this.update(user.id, before);
        this.saveError.set(true);
      },
    });
  }

  private update(id: string, permissions: AdminUser['permissions']): void {
    this.users.update((users) => users?.map((u) => (u.id === id ? { ...u, permissions } : u)) ?? null);
  }
}
