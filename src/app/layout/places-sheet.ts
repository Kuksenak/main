import { Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon, UiSheet } from '../core/ui';
import { PLACES } from './places';

/**
 * Phones: the sections, as Google's app launcher — a sheet from the bottom with a grid of big
 * icons and their names (the open one on a gray square); a tap goes there and the sheet goes.
 */
@Component({
  selector: 'app-places-sheet',
  imports: [Icon, TranslatePipe, UiSheet],
  templateUrl: './places-sheet.html',
})
export class PlacesSheet {
  readonly closed = output<void>();

  private readonly router = inject(Router);
  protected readonly places = PLACES;

  // (the start page: open only on itself)
  protected isOpen(path: string): boolean {
    return this.router.isActive(path, {
      paths: path === '/' ? 'exact' : 'subset',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  protected go(path: string, sheet: UiSheet): void {
    this.router.navigateByUrl(path);
    sheet.close();
  }
}
