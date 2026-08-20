import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, Observable, of, switchMap, tap, timeout } from 'rxjs';
import { environment } from '@environments/environment';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  calendarEnabled: boolean;
  telegramEnabled: boolean;
  isAdmin: boolean;
}

export interface Device {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface CalendarEvent {
  id: string;
  calendarName: string;
  title: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  location: string | null;
}

const REFRESH_TIMEOUT_MS = 5000;

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private http = inject(HttpClient);

  private _user = signal<UserProfile | null>(null);
  private _accessToken = signal<string | null>(null);
  private _devices = signal<Device[]>([]);
  private _calendarConnected = signal(false);
  private _events = signal<CalendarEvent[]>([]);
  private _eventsLoading = signal(false);
  private _initialized = signal(false);

  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly devices = this._devices.asReadonly();
  readonly calendarConnected = this._calendarConnected.asReadonly();
  readonly events = this._events.asReadonly();
  readonly eventsLoading = this._eventsLoading.asReadonly();
  readonly initialized = this._initialized.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly email = computed(() => this._user()?.email ?? null);
  readonly isAdmin = computed(() => this._user()?.isAdmin ?? false);
  readonly calendarAvailable = computed(() => this._user()?.calendarEnabled ?? false);
  readonly telegramAvailable = computed(() => this._user()?.telegramEnabled ?? false);

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
        tap((user) => {
          this._user.set(user);
          this.loadDevices();
          this.loadCalendarStatus();
        }),
        catchError(() => {
          this._user.set(null);
          this._accessToken.set(null);
          this._devices.set([]);
          this._calendarConnected.set(false);
          return of(null);
        }),
        finalize(() => this._initialized.set(true)),
      );
  }

  loadDevices(): void {
    this.http
      .get<{ devices: Device[] }>(`${environment.apiUrl}/sessions`)
      .pipe(catchError(() => of({ devices: [] })))
      .subscribe((res) => this._devices.set(res.devices ?? []));
  }

  loadCalendarStatus(): void {
    this.http
      .get<{ connected: boolean }>(`${environment.apiUrl}/calendars/status`)
      .pipe(catchError(() => of({ connected: false })))
      .subscribe((res) => {
        this._calendarConnected.set(res.connected);
        if (res.connected) {
          this.loadEvents();
        } else {
          this._events.set([]);
        }
      });
  }

  loadEvents(): void {
    this._eventsLoading.set(true);
    this.http
      .get<{ events: CalendarEvent[] }>(`${environment.apiUrl}/events`)
      .pipe(
        catchError(() => of({ events: [] })),
        finalize(() => this._eventsLoading.set(false)),
      )
      .subscribe((res) => this._events.set(res.events ?? []));
  }

  connectCalendar(): void {
    window.location.href = `${environment.apiUrl}/calendars/connect`;
  }

  disconnectCalendar(): void {
    this.http
      .post(`${environment.apiUrl}/calendars/disconnect`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this._calendarConnected.set(false);
        this._events.set([]);
      });
  }

  login(): void {
    window.location.href = `${environment.apiUrl}/signin/google`;
  }

  logout(): void {
    this.http
      .post(`${environment.apiUrl}/signout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this._user.set(null);
        this._accessToken.set(null);
        this._devices.set([]);
        this._calendarConnected.set(false);
        this._events.set([]);
      });
  }
}
