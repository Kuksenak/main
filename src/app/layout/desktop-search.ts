import { Injectable, signal } from '@angular/core';

/** Desktops: the search window open or not — opened by the sidebar's Search row, shown by DesktopLayout. */
@Injectable({ providedIn: 'root' })
export class DesktopSearch {
  readonly open = signal(false);
}
