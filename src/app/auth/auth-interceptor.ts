import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from './auth-store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);
    const token = auth.token();

    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`,
            }
        });
    }

    return next(req).pipe(
        catchError(error => {
            if (error.status === 401) {
                auth.signout();
            }
            return throwError(() => error);
        })
    );
};