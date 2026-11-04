import { Injectable, signal } from '@angular/core';

/** Desktops: the search window open or not — opened by a head's 🔍 or Ctrl K (⌘K), shown by DesktopLayout. */
@Injectable({ providedIn: 'root' })
export class DesktopSearch {
  readonly open = signal(false);
}
