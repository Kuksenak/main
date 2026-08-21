import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DeviceDetectionService {
  readonly isMobile = signal(this.detect());

  private detect(): boolean {
    if (typeof window === 'undefined') return false;

    const preset = document.documentElement.dataset['device'];
    if (preset) return preset === 'mobile';

    const ua = navigator.userAgent;
    return (
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    );
  }
}
