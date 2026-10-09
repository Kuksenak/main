import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, of, switchMap, tap, timeout } from 'rxjs';
import { environment } from '@environments/environment';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
}

const REFRESH_TIMEOUT_MS = 5000;

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _user = signal<UserProfile | null>(null);
  private _accessToken = signal<string | null>(null);
  private _initialized = signal(false);

  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly initialized = this._initialized.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly email = computed(() => this._user()?.email ?? null);
  /** First + last name, when the account has one. */
  readonly name = computed(() => {
    const u = this._user();
    return [u?.firstName, u?.lastName].filter((p) => !!p?.trim()).join(' ') || null;
  });

  setAccessToken(token: string): void {
    this._accessToken.set(token);
  }

  initAuth(): Observable<UserProfile | null> {
    return this.http
      .post<{ accessToken: string }>(`${environment.apiUrl}/refresh`, {}, { withCredentials: true })
      .pipe(
        timeout({ first: REFRESH_TIMEOUT_MS }),
        tap((res) => this._accessToken.set(res.accessToken)),
        switchMap(() => this.http.get<UserProfile>(`${environment.apiUrl}/me`)),
        tap((user) => this._user.set(user)),
        catchError(() => {
          this._user.set(null);
          this._accessToken.set(null);
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

  // Drop the session locally right away and go to the login page (nothing stays visible),
  // then tell the server to clear its refresh cookie.
  logout(): void {
    this._user.set(null);
    this._accessToken.set(null);
    this.router.navigateByUrl('/login');
    this.http
      .post(`${environment.apiUrl}/signout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }
}
