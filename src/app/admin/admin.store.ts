import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { environment } from '@environments/environment';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  calendarEnabled: boolean;
  telegramEnabled: boolean;
  calendarConnected: boolean;
  telegramLinked: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminStore {
  private http = inject(HttpClient);

  private _users = signal<AdminUser[]>([]);
  private _loading = signal(false);
  private _error = signal(false);

  readonly users = this._users.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  loadUsers(): void {
    this._loading.set(true);
    this._error.set(false);
    this.http
      .get<{ users: AdminUser[] }>(`${environment.apiUrl}/admin/users`)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res === null) {
          this._error.set(true);
        } else {
          this._users.set(res.users ?? []);
        }
        this._loading.set(false);
      });
  }

  setIntegrations(user: AdminUser, calendarEnabled: boolean, telegramEnabled: boolean): void {
    this._users.update((list) =>
      list.map((u) => (u.id === user.id ? { ...u, calendarEnabled, telegramEnabled } : u)),
    );

    this.http
      .post(`${environment.apiUrl}/admin/users/${user.id}/integrations`, {
        calendarEnabled,
        telegramEnabled,
      })
      .pipe(catchError(() => of(null)))
      .subscribe(() => this.loadUsers());
  }
}
