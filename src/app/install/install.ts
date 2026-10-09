import { Component, DestroyRef, inject } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { InstallService } from '../core/services/install.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon, IconName } from '../core/ui/icon/icon';

type Platform = 'ios' | 'android' | 'mac' | 'computer';

interface Guide {
  steps: { icon: IconName; text: TranslationKey }[];
  here?: TranslationKey; // the install link's text ("Or tap / click here")
}

/**
 * What the app as a PWA is, and how to install it — only for the system it's opened on, step by
 * step, with the icons to look for. A browser that can't install apps (e.g. Firefox) is told
 * which one can.
 */
@Component({
  selector: 'app-install',
  imports: [Icon, TranslatePipe],
  template: `
    <!-- Scrolls on its own (the layout doesn't) -->
    <main class="min-h-0 w-full flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
      <div class="mx-auto flex w-full max-w-xl flex-col gap-8">
      <!-- A sketch of where the app ends up: a phone's home screen, or a computer's dock -->
      <div class="flex justify-center pt-2">
        @if (phone) {
          <!-- A phone: home screen icons, ours ringed in blue -->
          <svg viewBox="0 0 120 220" class="h-44 text-[var(--text)]" aria-hidden="true">
            <defs><clipPath id="appIconPhone"><rect x="39.5" y="62" width="18" height="18" rx="5" /></clipPath></defs>
            <rect x="2" y="2" width="116" height="216" rx="22" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="2" />
            <rect x="48" y="11" width="24" height="7" rx="3.5" fill="currentColor" fill-opacity="0.25" />
            @for (r of [34, 62, 90, 118]; track r) {
              @for (c of [16, 39.5, 63, 86.5]; track c) {
                @if (!(r === 62 && c === 39.5)) {
                  <rect [attr.x]="c" [attr.y]="r" width="18" height="18" rx="5" fill="currentColor" fill-opacity="0.1" />
                }
              }
            }
            <image href="logo.png" x="39.5" y="62" width="18" height="18" clip-path="url(#appIconPhone)" />
            <rect x="36.5" y="59" width="24" height="24" rx="7.5" fill="none" stroke="var(--accent)" stroke-width="1.5" />
            <rect x="12" y="184" width="96" height="24" rx="11" fill="currentColor" fill-opacity="0.07" />
            @for (c of [21, 44, 67, 90]; track c) {
              <rect [attr.x]="c" y="189" width="14" height="14" rx="4" fill="currentColor" fill-opacity="0.12" />
            }
          </svg>
        } @else {
          <!-- A computer: a window, and ours in the dock / taskbar, ringed in blue -->
          <svg viewBox="0 0 240 172" class="h-40 text-[var(--text)]" aria-hidden="true">
            <defs><clipPath id="appIconDesk"><rect x="135" y="121" width="12" height="12" rx="3.5" /></clipPath></defs>
            <rect x="2" y="2" width="236" height="142" rx="9" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="2" />
            <path d="M104 144 100 162h40l-4-18M88 168h64" fill="none" stroke="currentColor" stroke-opacity="0.3" stroke-width="2" stroke-linecap="round" />
            <rect x="22" y="18" width="128" height="84" rx="5" fill="currentColor" fill-opacity="0.06" />
            <rect x="22" y="18" width="128" height="12" rx="5" fill="currentColor" fill-opacity="0.06" />
            <rect x="68" y="117" width="104" height="20" rx="7" fill="currentColor" fill-opacity="0.08" />
            @for (c of [75, 95, 115, 155]; track c) {
              <rect [attr.x]="c" y="121" width="12" height="12" rx="3.5" fill="currentColor" fill-opacity="0.14" />
            }
            <image href="logo.png" x="135" y="121" width="12" height="12" clip-path="url(#appIconDesk)" />
            <rect x="132" y="118" width="18" height="18" rx="5.5" fill="none" stroke="var(--accent)" stroke-width="1.5" />
          </svg>
        }
      </div>

      <div class="flex flex-col gap-1 text-body leading-relaxed opacity-70">
        <p>{{ 'install.intro' | t }}</p>
        <p>{{ 'install.intro2' | t }}</p>
      </div>

      @if (guide; as g) {
        <!-- The steps, each with the icon to look for (no numbers) -->
        <div class="card">
          @for (s of g.steps; track $index) {
            <p class="list-row gap-3 py-2.5 text-body leading-snug">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chip-ios)] text-[var(--text-secondary)]">
                <app-icon [name]="s.icon" [strokeWidth]="1.5" class="size-6" />
              </span>
              <span class="min-w-0 flex-1">
                {{ s.text | t }}
                <!-- Chrome / Edge / Android: their own install dialog, right from the first step -->
                @if ($first && install.canPrompt()) {
                  <button type="button" (click)="install.prompt()" class="inline font-medium text-[var(--accent)] active:opacity-60">{{ (g.here ?? 'install.clickHere') | t }}</button>
                }
              </span>
            </p>
          }
        </div>
      } @else {
        <div class="card">
          <p class="list-row text-body leading-snug">{{ 'install.unsupported' | t }}</p>
        </div>
      }
      </div>
    </main>
  `,
})
export class Install {
  protected readonly install = inject(InstallService);

  private static readonly guides: Record<Platform, Guide> = {
    ios: {
      steps: [
        { icon: 'share', text: 'install.ios.1' },
        { icon: 'ellipsis', text: 'install.ios.more' },
        { icon: 'plus-square', text: 'install.ios.2' },
        { icon: 'check', text: 'install.ios.3' },
      ],
    },
    android: {
      here: 'install.tapHere',
      steps: [
        { icon: 'dots-vertical', text: 'install.android.1' },
        { icon: 'install', text: 'install.android.2' },
        { icon: 'check', text: 'install.android.3' },
      ],
    },
    mac: {
      steps: [
        { icon: 'share', text: 'install.mac.1' },
        { icon: 'plus-square', text: 'install.mac.2' },
        { icon: 'check', text: 'install.mac.3' },
      ],
    },
    computer: {
      steps: [
        { icon: 'install', text: 'install.computer.1' },
        { icon: 'dots-vertical', text: 'install.computer.2' },
        { icon: 'check', text: 'install.computer.3' },
      ],
    },
  };

  // This device's guide; null where the browser can't install apps (desktop Firefox and the like).
  protected readonly guide: Guide | null = (() => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (ios) return Install.guides.ios; // Safari, and Chrome on iOS — both via Share
    if (/Android/.test(ua)) return Install.guides.android;
    const chromium = /Chrome|Chromium|Edg\//.test(ua);
    if (chromium) return Install.guides.computer;
    if (/Macintosh/.test(ua) && /Safari/.test(ua)) return Install.guides.mac;
    return null;
  })();

  // The sketch: a phone for iPhone / Android, else a computer.
  protected readonly phone = this.guide === Install.guides.ios || this.guide === Install.guides.android;

  constructor() {
    // Mobile toolbar: just ‹ (no title).
    const toolbar = inject(ToolbarService);
    toolbar.back.set(true);
    inject(DestroyRef).onDestroy(() => toolbar.back.set(false));
  }
}
