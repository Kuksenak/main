import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { AuthStore } from "./auth-store";
import { inject } from "@angular/core";
import { catchError, switchMap, throwError } from "rxjs";
import { environment } from "@environments/environment";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);
  const authStore = inject(AuthStore);
  const token = authStore.accessToken();

  let authReq = req.clone({
    withCredentials: true,
    setHeaders: token ? { Authorization: `Bearer ${token}` } : {}
  });

 return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Если 401 и это не сам запрос рефреша (чтобы не зациклиться)
      if (error.status === 401 && !req.url.includes('/refresh')) {
        
        return http.post<{ accessToken: string }>(
          `${environment.apiUrl}/refresh`, 
          {}, 
          { withCredentials: true }
        ).pipe(
          switchMap((res) => {
            // Обновляем токен в Store (Signal сработает автоматически)
            // authStore.setToken(res.accessToken);

            // Повторяем изначальный запрос с новым токеном
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${res.accessToken}` },
              withCredentials: true
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            // Если рефреш тоже сдох (кука в браузере удалена или протухла)
            authStore.signout();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};