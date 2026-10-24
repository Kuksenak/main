import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, of, tap, timeout } from 'rxjs';
import { environment } from '@environments/environment';
import { Area, atLeast, Level } from './permissions';

export interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  email: string;
  /** On the server's admin list: write in every area, and Users (everyone's access). */
  isAdmin: boolean;
  /** The level in each area (the API sends every one; the admins: write in all). */
  permissions: Partial<Record<Area, Level>>;
}

const ME_TIMEOUT_MS = 5000;

/**
 * Who's signed in. The session is an HTTP-only cookie the API set at sign-in (scripts can't see
 * it); the browser sends it along with every API call (withCredentials — see authInterceptor).
 * On start: GET /me — an account: signed in; 401 (no session, or it ran out): not.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<UserProfile | null>(null);
  private _initialized = signal(false);

  readonly user = this._user.asReadonly();
  readonly initialized = this._initialized.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly email = computed(() => this._user()?.email ?? null);
  /** First + last name, when the account has one. */
  readonly name = computed(() => {
    const u = this._user();
    return [u?.firstName, u?.lastName].filter((p) => !!p?.trim()).join(' ') || null;
  });
  readonly isAdmin = computed(() => this._user()?.isAdmin ?? false);

  /** Whether the user has at least `level` in the area (write includes read; admins: everything). */
  can(area: Area, level: Level = 'read'): boolean {
    const u = this._user();
    return !!u && (u.isAdmin || atLeast(u.permissions?.[area], level));
  }

  initAuth(): Observable<UserProfile | null> {
    return this.http.get<UserProfile>(`${environment.apiUrl}/me`).pipe(
      timeout({ first: ME_TIMEOUT_MS }),
      tap((user) => this._user.set(user)),
      catchError(() => {
        this._user.set(null);
        return of(null);
      }),
      finalize(() => this._initialized.set(true)),
    );
  }

  /** Set when sign-in couldn't start because the API is down (shown on the login page). */
  readonly loginError = signal(false);
  readonly loggingIn = signal(false);

  /**
   * Sign in with Google — but first check the API answers (GET /ping, 5 s), so a server that's
   * down shows our own message instead of the host's error page.
   */
  async login(): Promise<void> {
    if (this.loggingIn()) return;
    this.loggingIn.set(true);
    this.loginError.set(false);
    try {
      const res = await fetch(`${environment.apiUrl}/ping`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`ping ${res.status}`);
      window.location.href = `${environment.apiUrl}/signin/google`;
    } catch {
      this.loginError.set(true);
      this.loggingIn.set(false);
    }
  }

  /** The session ran out (a call got 401): signed out here too, to the login page. */
  expired(): void {
    this._user.set(null);
    this.router.navigateByUrl('/login');
  }

  /** Sign out this device: dropped here right away (nothing stays visible), then the API deletes the session. */
  logout(): void {
    this.signOut('signout');
  }

  /** Sign out every device of the account (this one too). */
  logoutEverywhere(): void {
    this.signOut('signout/everywhere');
  }

  private signOut(path: string): void {
    this.http
      .post(`${environment.apiUrl}/${path}`, {})
      .pipe(catchError(() => of(null)))
      .subscribe();
    this.expired();
  }
}
