import { Component, DestroyRef, inject } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { InstallService } from '../core/services/install.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon, IconName } from '../core/ui/icon/icon';

type Platform = 'ios' | 'android' | 'mac' | 'computer';

interface Guide {
  steps: { icon: IconName; text: TranslationKey }[];
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
      <div class="flex flex-col gap-3">
        <p class="text-[1.0625rem] leading-relaxed opacity-70">{{ 'install.intro' | t }}</p>
        <!-- Chrome / Edge / Android: their own install dialog, right from here -->
        @if (install.canPrompt()) {
          <button type="button" (click)="install.prompt()" class="btn-secondary mt-1 self-start">
            <app-icon name="install" class="size-5" />
            {{ 'install.button' | t }}
          </button>
        }
      </div>

      @if (guide; as g) {
        <!-- Numbered steps, each with the icon to look for -->
        <div class="card">
          @for (s of g.steps; track $index) {
            <div class="list-row !items-start gap-3 py-3">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--chip-ios)]">
                <app-icon [name]="s.icon" class="size-6" />
              </span>
              <p class="min-w-0 flex-1 self-center text-[1.0625rem] leading-snug">
                <span class="font-semibold tabular-nums opacity-40">{{ $index + 1 }}.</span>
                {{ s.text | t }}
              </p>
            </div>
          }
        </div>
      } @else {
        <div class="card">
          <p class="list-row py-3 text-[1.0625rem] leading-snug">{{ 'install.unsupported' | t }}</p>
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
        { icon: 'plus-square', text: 'install.ios.2' },
        { icon: 'check', text: 'install.ios.3' },
      ],
    },
    android: {
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

  constructor() {
    // Mobile toolbar: just ‹ (no title).
    const toolbar = inject(ToolbarService);
    toolbar.back.set(true);
    inject(DestroyRef).onDestroy(() => toolbar.back.set(false));
  }
}
