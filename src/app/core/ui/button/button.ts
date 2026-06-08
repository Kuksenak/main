import { Component, Input, inject, output } from '@angular/core';
import { DeviceDetectionService } from '../../services/device-detection.service';

type ButtonVariant = 'primary' | 'secondary';

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

  private deviceService = inject(DeviceDetectionService);
  isMobile = this.deviceService.isMobile;

  onClick(event: MouseEvent) {
    if (this.disabled) return;

    // Haptic feedback для iOS/мобильных
    this.triggerHaptic();

    this.clicked.emit(event);
  }

  private triggerHaptic() {
    if (!this.isMobile()) return;

    // Vibration API для haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // 10ms микровибрация
    }
  }
}
