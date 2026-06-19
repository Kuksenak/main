import { Component, Input, output, signal } from '@angular/core';

/** @deprecated Не отрефакторено (legacy). Мигрировать на Tailwind + signals. */
@Component({
  selector: 'app-stepper',
  standalone: true,
  templateUrl: './stepper.html',
  styleUrl: './stepper.scss',
})
export class Stepper {
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;

  value = signal(1);
  valueChanged = output<number>();

  // Для кинематического эффекта
  isAnimating = false;
  animationDirection = 0; // 1 для вверх, -1 для вниз

  increment() {
    const newValue = Math.min(this.value() + this.step, this.max);
    if (newValue !== this.value()) {
      this.triggerAnimation(1);
      this.value.set(newValue);
      this.valueChanged.emit(newValue);
      this.triggerHaptic();
    }
  }

  decrement() {
    const newValue = Math.max(this.value() - this.step, this.min);
    if (newValue !== this.value()) {
      this.triggerAnimation(-1);
      this.value.set(newValue);
      this.valueChanged.emit(newValue);
      this.triggerHaptic();
    }
  }

  private triggerAnimation(direction: number) {
    this.animationDirection = direction;
    this.isAnimating = true;
    setTimeout(() => {
      this.isAnimating = false;
    }, 300);
  }

  private triggerHaptic() {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }
}
