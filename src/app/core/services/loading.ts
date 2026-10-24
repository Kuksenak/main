import { HttpInterceptorFn } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';

/**
 * Something's loading (any call to the API: `loadingInterceptor` counts them): the app shows a
 * thin bar running along the screen's bottom while `visible`. Once shown, it runs at least one
 * whole pass (1.8s), so a call done at once still shows as a pass, not a flicker.
 */
@Injectable({ providedIn: 'root' })
export class Loading {
  private count = 0;
  private startedAt = 0;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  readonly visible = signal(false);

  begin(): void {
    if (++this.count !== 1) return;
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = null;
    if (!this.visible()) this.startedAt = Date.now();
    this.visible.set(true);
  }

  end(): void {
    this.count = Math.max(0, this.count - 1);
    if (this.count) return;
    const wait = Math.max(0, 1800 - (Date.now() - this.startedAt));
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      if (!this.count) this.visible.set(false);
    }, wait);
  }
}

/** Every API call counted as loading while it's on its way. */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(Loading);
  loading.begin();
  return next(req).pipe(finalize(() => loading.end()));
};
