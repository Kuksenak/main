import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DeviceDetectionService {
  readonly isMobile = signal(this.detectMobileDevice());

  private detectMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;

    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent
    );
    const hasTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0;

    return isMobileUA || hasTouch;
  }
}
