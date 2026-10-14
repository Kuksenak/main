import { Injectable, signal } from '@angular/core';

/** The inbox (desktop): a panel at the right, over the page — open or not. */
@Injectable({ providedIn: 'root' })
export class InboxService {
  readonly open = signal(false);
}
