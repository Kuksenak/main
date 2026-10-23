import { Component, ElementRef, inject, input } from '@angular/core';
import { Icon, IconName } from '../core/ui/icon/icon';

/**
 * A button (or a link styled as one), as Notion's head buttons: no fill, the small UI text, a thin
 * icon before the label (`icon`; or a `<ui-avatar>` put inside), ▾ after it (`caret`: it opens a
 * menu). A light fill on hover and while its menu is open (aria-expanded); a long label ends in ….
 */
@Component({
  selector: 'button[uiButton], a[uiButton]',
  imports: [Icon],
  template: `
    <ng-content select="ui-avatar" />
    @if (icon(); as name) {
      <app-icon [name]="name" class="icon" />
    }
    <span class="label"><ng-content /></span>
    @if (caret()) {
      <app-icon name="chevron-down" class="caret" />
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      gap: 0.375rem;
      height: var(--button-h);
      padding: 0 var(--button-px);
      border-radius: var(--radius-button);
      font-size: var(--text-ui);
      line-height: 1.25;
      color: var(--text);
      white-space: nowrap;
      transition: background-color 120ms;
    }
    :host(:hover:not(:disabled)),
    :host([aria-expanded='true']) {
      background: var(--tint);
    }
    :host(:active:not(:disabled)) {
      background: var(--tint-strong);
    }
    :host(:disabled) {
      opacity: 0.45;
    }
    .icon {
      width: var(--icon-ui);
      height: var(--icon-ui);
      opacity: 0.85;
    }
    .label {
      max-width: var(--button-label-max);
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .label:empty {
      display: none;
    }
    .caret {
      width: calc(var(--icon-ui) * 0.875);
      height: calc(var(--icon-ui) * 0.875);
      margin-left: -0.125rem;
      opacity: 0.5;
    }
  `,
})
export class UiButton {
  readonly icon = input<IconName>();
  readonly caret = input(false);
  /** (the element: what a `<ui-menu>` opens at) */
  readonly element: HTMLElement = inject(ElementRef).nativeElement;
}
