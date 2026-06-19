import { Component, Input, output } from '@angular/core';

type ButtonVariant = 'primary' | 'secondary';

/** @deprecated Не отрефакторено (legacy). Мигрировать на Tailwind + signals. */
@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  @Input() variant: ButtonVariant = 'primary';
  @Input() disabled = false;

  clicked = output<MouseEvent>();

  onClick(event: MouseEvent) {
    if (this.disabled) return;

    this.clicked.emit(event);
  }
}
