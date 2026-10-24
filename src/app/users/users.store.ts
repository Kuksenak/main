import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { AREAS, Area } from '../auth/permissions';
import { I18nService } from '../core/i18n/i18n.service';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  lastSignInAt: string;
  isAdmin: boolean;
  permissions: Partial<Record<Area, boolean>>;
  // AI questions a day (null: the app's own number) and asked today
  aiPerDay: number | null;
  aiAskedToday: number;
}

interface UsersResponse {
  areas: string[];
  users: User[];
  aiPerDay: number | null;
}

/**
 * The users and their access (the admins only), for the Users page (desktop) and the account
 * sheet's Users (phones): `load()` them; an area's access `set` (on / off) is shown at once and
 * saved — back as it was if that fails; the AI questions a day `setAiLimit` (null: the app's own).
 */
@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly url = `${environment.apiUrl}/users`;

  readonly users = signal<User[] | null>(null);
  // (the areas the server sends that this app knows: their names are here)
  readonly areas = signal<Area[]>([]);
  // The AI questions a day a user has unless set for them (null: AI is off on the server)
  readonly aiDefault = signal<number | null>(null);
  readonly loadError = signal(false);
  readonly saveError = signal(false);

  load(): void {
    this.loadError.set(false);
    this.http.get<UsersResponse>(this.url).subscribe({
      next: (res) => {
        this.areas.set(AREAS.filter((a) => res.areas.includes(a)));
        this.aiDefault.set(res.aiPerDay);
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

  /** Whether the user may open the area (the admins: every one). */
  has(user: User, area: Area): boolean {
    return user.isAdmin || !!user.permissions[area];
  }

  /** The AI questions a user may ask a day (null: the app's own number): saved, then shown. */
  setAiLimit(user: User, perDay: number | null): void {
    if (user.aiPerDay === perDay) return;
    this.saveError.set(false);
    this.http.put<User>(`${this.url}/${user.id}/ai-limit`, { perDay }).subscribe({
      next: (saved) => this.users.update((users) => users?.map((u) => (u.id === saved.id ? saved : u)) ?? null),
      error: () => this.saveError.set(true),
    });
  }

  /** The AI limit as typed: a number (0 and up), or nothing — the app's own. */
  setAiLimitTyped(user: User, value: string): void {
    const perDay = value.trim() === '' ? null : Math.max(0, Math.min(10_000, Math.round(Number(value))));
    if (perDay === null || Number.isFinite(perDay)) this.setAiLimit(user, perDay);
  }

  /** An area's access switched: shown at once, saved; if that fails, back as it was. */
  set(user: User, area: Area, access: boolean): void {
    if (user.isAdmin || this.has(user, area) === access) return;
    const before = user.permissions;
    this.saveError.set(false);
    this.update(user.id, { ...before, [area]: access });
    this.http.put<User>(`${this.url}/${user.id}/permissions`, { [area]: access }).subscribe({
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
