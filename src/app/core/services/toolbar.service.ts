import { Injectable, TemplateRef, signal } from '@angular/core';

/**
 * Lets the current page fill the mobile toolbar: a plain title (e.g. the visible month), or
 * its own content such as a search field (`content` wins over `title`). `back`: a round ‹
 * before the title, for pages opened from a menu (Settings, About). `overlay`: the toolbar floats
 * over the page with no background of its own (the page scrolls under it and draws the fade).
 * `actions`: the page's own round buttons, at the left. `hidden`: out of the way (phones' search
 * takes its place).
 */
@Injectable({ providedIn: 'root' })
export class ToolbarService {
  readonly title = signal('');
  readonly content = signal<TemplateRef<unknown> | null>(null);
  readonly back = signal(false);
  readonly overlay = signal(false);
  readonly actions = signal<TemplateRef<unknown> | null>(null);
  readonly hidden = signal(false);
}
