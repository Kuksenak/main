import { Component, Input, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DeviceDetectionService } from '../../services/device-detection.service';

@Component({
  selector: 'app-switch',
  imports: [],
  templateUrl: './switch.html',
  styleUrl: './switch.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Switch),
      multi: true,
    },
  ],
})
export class Switch implements ControlValueAccessor {
  @Input() label = '';

  private deviceService = inject(DeviceDetectionService);

  isMobile = this.deviceService.isMobile;

  checked = false;
  disabled = false;

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  onToggle(event: Event) {
    if (this.disabled) return;

    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    this.onChange(this.checked);
    this.onTouched();
  }

  writeValue(value: boolean): void {
    this.checked = value ?? false;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
