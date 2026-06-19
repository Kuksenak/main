import { Component } from '@angular/core';

/** @deprecated Не отрефакторено (legacy). Мигрировать на Tailwind + signals. */
@Component({
  selector: 'button[app-btn]',
  imports: [],
  template: '<ng-content></ng-content>',
  // styleUrl: './button.scss',
})
export class Button { }