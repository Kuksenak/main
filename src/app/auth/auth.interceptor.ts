import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from './auth.store';

/**
 * Every API call with the session cookie (withCredentials: the API is on another host). A 401 on
 * any call but the start's /me: the session ran out — signed out (AuthStore.expired).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);

  return next(req.clone({ withCredentials: true })).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && authStore.isAuthenticated()) authStore.expired();
      return throwError(() => error);
    }),
  );
};
