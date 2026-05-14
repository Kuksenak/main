import { Component, input, output } from '@angular/core';

export type SnackType = 'info' | 'success' | 'error';
@Component({
  selector: 'app-snack',
  imports: [],
  templateUrl: './snack.html',
  styleUrl: './snack.scss',
})
export class Snack {
  message = input.required<string>();
  type = input<SnackType>('info');
  close = output<void>();
}