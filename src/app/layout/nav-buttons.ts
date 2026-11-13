import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { UiTip } from '../core/ui/tip/tip';

/**
 * ‹ › back and forward, at the left of a section's top row (desktops), as Notion's — only in an installed
 * app with the window's own title bar (components.css shows them then): a browser has its own, the app's
 * own title bar ours (DesktopLayout).
 *   <app-nav-buttons />
 */
@Component({
  selector: 'app-nav-buttons',
  imports: [Icon, TranslatePipe, UiTip],
  host: { 'data-nav-buttons': '', class: 'hidden shrink-0 items-center gap-0.5' },
  template: `
    <button type="button" (click)="location.back()" [uiTip]="'nav.back' | t" [attr.aria-label]="'nav.back' | t" class="grid size-button place-items-center rounded-button text-icon hover:bg-tint hover:text-fg">
      <app-icon name="chevron-left" class="size-icon-menu" />
    </button>
    <button type="button" (click)="location.forward()" [uiTip]="'nav.forward' | t" [attr.aria-label]="'nav.forward' | t" class="grid size-button place-items-center rounded-button text-icon hover:bg-tint hover:text-fg">
      <app-icon name="chevron-right" class="size-icon-menu" />
    </button>
  `,
})
export class NavButtons {
  protected readonly location = inject(Location);
}
