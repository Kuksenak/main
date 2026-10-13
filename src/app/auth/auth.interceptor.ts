import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { AuthStore } from './auth.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);
  const authStore = inject(AuthStore);
  const token = authStore.accessToken();

  const authReq = req.clone({
    withCredentials: true,
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Public pages (a student's portal, a shared lesson) handle their own 401 (e.g. the PIN):
      // no session to refresh, no login page
      const isPublic = req.url.startsWith(`${environment.apiUrl}/portal/`) || req.url.startsWith(`${environment.apiUrl}/shared/`);
      if (error.status !== 401 || req.url.includes('/refresh') || isPublic) {
        return throwError(() => error);
      }

      return http
        .post<{ accessToken: string }>(`${environment.apiUrl}/refresh`, {}, { withCredentials: true })
        .pipe(
          switchMap((res) => {
            authStore.setAccessToken(res.accessToken);
            const retryReq = req.clone({
              withCredentials: true,
              setHeaders: { Authorization: `Bearer ${res.accessToken}` },
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            authStore.logout();
            return throwError(() => refreshError);
          }),
        );
    }),
  );
};
