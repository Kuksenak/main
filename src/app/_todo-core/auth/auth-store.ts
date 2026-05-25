import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Theme } from 'app/_todo-core/theme/theme'; // Твой ThemeService
import { catchError, finalize, Observable, of, switchMap, tap, timeout } from 'rxjs';
import { environment } from '@environments/environment';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  theme: string;
  accentColor: string;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  calendarName: string;
  title: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  description: string | null;
  location: string | null;
}

export interface EventsResponse {
  events: CalendarEvent[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthStore {
  private http = inject(HttpClient);
  private router = inject(Router);
  private themeService = inject(Theme);

  // Состояние (Private Signals)
  private _user = signal<UserProfile | null>(null);
  private _accessToken = signal<string | null>(null);
  private _events = signal<CalendarEvent[]>([]);
  private _eventsLoading = signal(false);

  // Публичные данные (Readonly)
  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly events = this._events.asReadonly();
  readonly eventsLoading = this._eventsLoading.asReadonly();
  readonly isAuthenticated = computed(() => !!this._user());

  /**
   * Инициализация аутентификации (вызывается при старте приложения)
   */
  initAuth(): Observable<UserProfile | null> {
    return this.http.post<{ accessToken: string }>(
      `${environment.apiUrl}/refresh`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(res => this._accessToken.set(res.accessToken)),
      switchMap(() => this.fetchProfile()),
      catchError(() => {
        this._user.set(null);
        return of(null);
      })
    );
  }

  /**
   * Загрузка профиля и синхронизация темы
   */
  private fetchProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${environment.apiUrl}/me`).pipe(
      tap(user => {
        // 1. Сначала обновляем пользователя
        this._user.set(user);
        console.log('User profile loaded:', user);
        // 2. Синхронизируем тему БЕЗ триггера повторного сохранения на бэк
        // Используем метод 'setFromApi' (нужно добавить в ThemeService)
        // или просто проверяем наличие данных
        if (user.theme) {
          this.themeService.updateFromProfile(user.theme, user.accentColor);
        }
        this.fetchEvents().subscribe(); // Загружаем события после загрузки профиля
      })
    );
  }

  loadEvents(): Observable<EventsResponse> {
    return this.fetchEvents();
  }

  private fetchEvents(): Observable<EventsResponse> {
    this._eventsLoading.set(true);

    return this.http.get<EventsResponse>(`${environment.apiUrl}/events`).pipe(
      tap((response) => {
        this._events.set(response.events ?? []);
      }),
      catchError((err) => {
        console.error('Failed to load events', err);
        this._events.set([]);
        return of({ events: [] });
      }),
      finalize(() => {
        this._eventsLoading.set(false);
      })
    );
  }

  signin(): void {
    this.http
      .get(`${environment.apiUrl}/health`, { responseType: 'text' })
      .pipe(timeout({ first: 2500 }))
      .subscribe({
        next: () => {
          const returnUrl = encodeURIComponent('/home');
          window.location.href = `${environment.apiUrl}/signin/google?returnUrl=${returnUrl}`;
        },
        error: () => {
          this.router.navigate(['/server-error']);
        }
      });
  }

  signout(): void {
    this.http.post(`${environment.apiUrl}/signout`, {}, { withCredentials: true })
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this._user.set(null);
        this._accessToken.set(null);
        // this.router.navigate(['/login']);
      });
  }

  /**
   * Оптимистичное обновление профиля (тема, цвет)
   */
  updateProfile(updates: { theme?: string; accentColor?: string }): void {
    const previousUser = this._user();
    if (!previousUser) return;

    const isThemeChanged = updates.theme !== undefined && updates.theme !== previousUser.theme;
    const isColorChanged = updates.accentColor !== undefined && updates.accentColor !== previousUser.accentColor;

    if (!isThemeChanged && !isColorChanged) return;

    this._user.set({
      ...previousUser,
      ...updates
    });

    this.themeService.updateFromProfile(
      updates.theme ?? previousUser.theme,
      updates.accentColor ?? previousUser.accentColor
    );

    this.http.patch<void>(`${environment.apiUrl}/me`, updates)
      .subscribe({
        next: () => {
          console.log('Profile settings saved successfully');
        },
        error: (err) => {
          console.error('Failed to save profile settings, reverting...', err);

          this._user.set(previousUser);

          this.themeService.updateFromProfile(
            previousUser.theme,
            previousUser.accentColor
          );
        }
      });
  }
}