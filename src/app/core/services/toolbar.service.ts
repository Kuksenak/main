import { Injectable, TemplateRef, signal } from '@angular/core';

/**
 * Lets the current page fill the mobile toolbar: a plain title (e.g. the visible month), or
 * its own content such as a search field (`content` wins over `title`).
 */
@Injectable({ providedIn: 'root' })
export class ToolbarService {
  readonly title = signal('');
  readonly content = signal<TemplateRef<unknown> | null>(null);
}
