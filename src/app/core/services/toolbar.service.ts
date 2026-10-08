import { Injectable, signal } from '@angular/core';

/** Lets a page put its title (e.g. the visible month) into the mobile toolbar. */
@Injectable({ providedIn: 'root' })
export class ToolbarService {
  readonly title = signal('');
}
