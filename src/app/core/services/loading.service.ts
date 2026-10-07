import { Injectable, signal } from '@angular/core';

/**
 * Global loading indicator. Any component/service calls begin()/end()
 * (balanced); the layout renders a running bar while `visible` is true.
 *
 * Once shown, the bar stays visible for at least one full animation cycle,
 * so a request that finishes instantly still completes a visible pass.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private count = 0;
  private startedAt = 0;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly minVisibleMs = 1100; // matches the bar animation duration

  private readonly _visible = signal(false);
  readonly visible = this._visible.asReadonly();

  begin(): void {
    this.count += 1;
    if (this.count === 1) {
      if (this.hideTimer) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      this.startedAt = Date.now();
      this._visible.set(true);
    }
  }

  end(): void {
    this.count = Math.max(0, this.count - 1);
    if (this.count !== 0) return;

    const wait = Math.max(0, this.minVisibleMs - (Date.now() - this.startedAt));
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      if (this.count === 0) this._visible.set(false);
    }, wait);
  }
}
