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
      <!-- The logo, what the app is (from About), then why install it -->
      <img src="logo.png" [alt]="'app.name' | t" class="size-16" width="64" height="64" />
      <div class="-mt-4 flex flex-col gap-3 text-body leading-relaxed">
        <p>{{ 'about.description' | t }}</p>
        <p class="opacity-70">{{ 'install.intro' | t }} {{ 'install.intro2' | t }}</p>
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
        { icon: 'chevron-down', text: 'install.ios.more' },
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

  constructor() {
    // Mobile toolbar: just ‹ (no title).
    const toolbar = inject(ToolbarService);
    toolbar.back.set(true);
    inject(DestroyRef).onDestroy(() => toolbar.back.set(false));
  }
}
