import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DeviceDetectionService {
  readonly isMobile = signal(this.detectMobileDevice());

  private detectMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;

    // The inline script in index.html sets this before Angular bootstraps,
    // so detection result is already available with zero extra cost.
    const preset = document.documentElement.dataset['device'];
    if (preset) return preset === 'mobile';

    // Fallback if the script didn't run (e.g. CSP blocked it).
    const ua = navigator.userAgent;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) ||
           'ontouchstart' in window ||
           navigator.maxTouchPoints > 0;
  }
}
