import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthStore } from './auth.store';

/**
 * Every API call with the access token. A 401 (the token ran out): a new one (AuthStore.refresh —
 * one for all the calls that hit it at once), then the call again; no new one: signed out.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const token = authStore.accessToken();

  const authReq = req.clone({
    withCredentials: true,
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || req.url.includes('/refresh')) {
        return throwError(() => error);
      }

      return authStore.refresh().pipe(
        catchError((refreshError) => {
          authStore.logout();
          return throwError(() => refreshError);
        }),
        switchMap((fresh) =>
          next(req.clone({ withCredentials: true, setHeaders: { Authorization: `Bearer ${fresh}` } })),
        ),
      );
    }),
  );
};
