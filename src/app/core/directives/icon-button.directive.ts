import { Directive, Input, HostBinding, inject } from '@angular/core';
import { DeviceDetectionService } from '../services/device-detection.service';

type IconButtonVariant = 'glass' | 'tinted' | 'ghost';

/**
 * Директива для круглых icon-кнопок в стиле iOS
 *
 * @example
 * <button appIconButton>
 *   <svg>...</svg>
 * </button>
 *
 * <button appIconButton="tinted">
 *   <svg>...</svg>
 * </button>
 *
 * @deprecated Не отрефакторено (legacy). Мигрировать на Tailwind + signals.
 */
@Directive({
  selector: 'button[appIconButton]',
  standalone: true,
})
export class IconButtonDirective {
  // @Input('appIconButton') variant: IconButtonVariant | '' = 'glass';

  // private deviceService = inject(DeviceDetectionService);
  // private isMobile = this.deviceService.isMobile;

  // @HostBinding('class')
  // get classes(): string {
  //   const baseClasses = 'icon-btn';
  //   const variantClass = this.variant ? `icon-btn-${this.variant}` : 'icon-btn-glass';
  //   const deviceClass = this.isMobile() ? 'mobile' : 'desktop';

  //   return `${baseClasses} ${variantClass} ${deviceClass}`;
  // }

  // @HostBinding('attr.type')
  // get type(): string {
  //   return 'button';
  // }
}
