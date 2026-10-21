import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, switchMap, tap, throwError, timeout, timer } from 'rxjs';
import { environment } from '@environments/environment';

export interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  email: string;
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

  private refreshing: Observable<string> | null = null;

  /**
   * A new access token from the refresh cookie (the cookie renewed too). One at a time: requests
   * that need it meanwhile share the one under way — two at once with one token would look stolen
   * to the server. 409: another tab refreshed that moment (the cookie is already the new one) —
   * once more, a moment later.
   */
  refresh(): Observable<string> {
    const post = () =>
      this.http.post<{ accessToken: string }>(`${environment.apiUrl}/refresh`, {}, { withCredentials: true });
    this.refreshing ??= post().pipe(
      catchError((e: HttpErrorResponse) => (e.status === 409 ? timer(300).pipe(switchMap(post)) : throwError(() => e))),
      map((res) => res.accessToken),
      tap((token) => this._accessToken.set(token)),
      finalize(() => (this.refreshing = null)),
      shareReplay(1),
    );
    return this.refreshing;
  }

  initAuth(): Observable<UserProfile | null> {
    return this.refresh()
      .pipe(
        timeout({ first: REFRESH_TIMEOUT_MS }),
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
