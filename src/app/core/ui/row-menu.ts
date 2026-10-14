import { Component, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../i18n/t.pipe';
import { Icon } from './icon/icon';
import { Sheet } from './sheet/sheet';

/**
 * A row's ⋯ (shown on the row's hover, as Notion's): Open in new tab (its page) and Remove (from
 * the list it's in — the event's participants / lessons, a group's members).
 */
@Component({
  selector: 'app-row-menu',
  imports: [Icon, Sheet, TranslatePipe],
  host: { class: 'contents' },
  template: `
    <button #btn type="button" (click)="open.set(!open())" [attr.aria-expanded]="open()" [attr.aria-label]="'lessons.more' | t" class="row-dots"><app-icon name="dots" class="size-4" /></button>
    @if (open()) {
      <app-sheet [origin]="btn" [fit]="true" (closed)="open.set(false)">
        <div class="menu-list">
          @if (link(); as l) {
            <button type="button" (click)="newTab(l)" class="menu-item"><app-icon name="popout" /><span class="flex-1">{{ 'action.openNewTab' | t }}</span></button>
          }
          <button type="button" (click)="open.set(false); removed.emit()" class="menu-item is-danger"><app-icon name="trash" /><span class="flex-1">{{ 'action.remove' | t }}</span></button>
        </div>
      </app-sheet>
    }
  `,
})
export class RowMenu {
  /** Its page (router commands), for Open in new tab; null: none. */
  readonly link = input<unknown[] | null>(null);
  readonly removed = output<void>();
  protected readonly open = signal(false);
  private readonly router = inject(Router);

  protected newTab(link: unknown[]): void {
    this.open.set(false);
    window.open(this.router.serializeUrl(this.router.createUrlTree(link)), '_blank');
  }
}
