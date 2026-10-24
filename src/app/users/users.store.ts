import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { AREAS, Area, LEVEL_LABELS, LEVELS, Level } from '../auth/permissions';
import { I18nService } from '../core/i18n/i18n.service';
import { UiSegment } from '../core/ui';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  lastSignInAt: string;
  isAdmin: boolean;
  permissions: Partial<Record<Area, Level>>;
}

interface UsersResponse {
  areas: string[];
  users: User[];
}

/**
 * The users and their access (the admins only), for the Users page (desktop) and the account
 * sheet's Users (phones): `load()` them; a level `set` is shown at once and saved — back as it was
 * if that fails.
 */
@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly url = `${environment.apiUrl}/users`;

  readonly users = signal<User[] | null>(null);
  // (the areas the server sends that this app knows: their names are here)
  readonly areas = signal<Area[]>([]);
  readonly loadError = signal(false);
  readonly saveError = signal(false);

  /** The levels to pick from, by name. */
  readonly levels = computed<UiSegment<Level>[]>(() =>
    LEVELS.map((level) => ({ value: level, label: this.i18n.t(LEVEL_LABELS[level]) })),
  );

  load(): void {
    this.loadError.set(false);
    this.http.get<UsersResponse>(this.url).subscribe({
      next: (res) => {
        this.areas.set(AREAS.filter((a) => res.areas.includes(a)));
        this.users.set(res.users);
      },
      error: () => this.loadError.set(true),
    });
  }

  user(id: string): User | undefined {
    return this.users()?.find((u) => u.id === id);
  }

  name(user: User): string | null {
    return [user.firstName, user.lastName].filter((p) => !!p?.trim()).join(' ') || null;
  }

  lastSignIn(user: User): string {
    return this.i18n.date(new Date(user.lastSignInAt), { dateStyle: 'medium', timeStyle: 'short' });
  }

  level(user: User, area: Area): Level {
    return user.isAdmin ? 'write' : (user.permissions[area] ?? 'none');
  }

  /** A level picked: shown at once, saved; if that fails, back as it was. */
  set(user: User, area: Area, level: Level | undefined): void {
    if (!level || user.isAdmin || this.level(user, area) === level) return;
    const before = user.permissions;
    this.saveError.set(false);
    this.update(user.id, { ...before, [area]: level });
    this.http.put<User>(`${this.url}/${user.id}/permissions`, { [area]: level }).subscribe({
      next: (saved) => this.update(user.id, saved.permissions),
      error: () => {
        this.update(user.id, before);
        this.saveError.set(true);
      },
    });
  }

  private update(id: string, permissions: User['permissions']): void {
    this.users.update((users) => users?.map((u) => (u.id === id ? { ...u, permissions } : u)) ?? null);
  }
}
