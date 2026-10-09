import { Component, DestroyRef, inject } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { InstallService } from '../core/services/install.service';
import { ToolbarService } from '../core/services/toolbar.service';

type Platform = 'iphone' | 'android' | 'computer';

/** What the app as a PWA is, and how to put it on a phone's home screen or a computer. */
@Component({
  selector: 'app-install',
  imports: [TranslatePipe],
  template: `
    <main class="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div class="flex flex-col items-center gap-4 text-center">
        <img src="logo.png" [alt]="'app.name' | t" class="size-20" width="80" height="80" />
        <h1 class="text-2xl font-semibold">{{ 'nav.install' | t }}</h1>
        <p class="text-callout max-w-md text-balance leading-relaxed opacity-60">{{ 'install.intro' | t }}</p>
        <!-- Chrome / Edge / Android: their own install dialog, right from here -->
        @if (install.canPrompt()) {
          <button type="button" (click)="install.prompt()" class="btn-primary mt-2">{{ 'install.button' | t }}</button>
        }
      </div>

      <!-- How, per platform — this device's first -->
      <div class="mt-10 flex flex-col gap-6">
        @for (p of platforms; track p.key) {
          <div class="flex flex-col gap-1.5">
            <span class="text-footnote opacity-50">{{ p.title | t }}</span>
            <div class="card">
              <p class="list-row text-body leading-relaxed">{{ p.steps | t }}</p>
            </div>
          </div>
        }
      </div>
    </main>
  `,
})
export class Install {
  protected readonly install = inject(InstallService);

  private static readonly all: { key: Platform; title: TranslationKey; steps: TranslationKey }[] = [
    { key: 'iphone', title: 'install.iphone', steps: 'install.iphoneSteps' },
    { key: 'android', title: 'install.android', steps: 'install.androidSteps' },
    { key: 'computer', title: 'install.computer', steps: 'install.computerSteps' },
  ];

  protected readonly platforms = (() => {
    const ua = navigator.userAgent;
    const here: Platform =
      /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
        ? 'iphone'
        : /Android/.test(ua)
          ? 'android'
          : 'computer';
    return [...Install.all].sort((a, b) => Number(b.key === here) - Number(a.key === here));
  })();

  constructor() {
    // Mobile toolbar: just ‹ (no title).
    const toolbar = inject(ToolbarService);
    toolbar.back.set(true);
    inject(DestroyRef).onDestroy(() => toolbar.back.set(false));
  }
}
