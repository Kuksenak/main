import { Component, Input, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { DeviceDetectionService } from '../../services/device-detection.service';

export interface SelectOption {
  value: unknown;
  label: string;
}

@Component({
  selector: 'app-select',
  imports: [OverlayModule],
  templateUrl: './select.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Select),
      multi: true,
    },
  ],
})
export class Select implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Select…';
  @Input() options: SelectOption[] = [];
  @Input() disabled = false;

  private deviceService = inject(DeviceDetectionService);

  isMobile = this.deviceService.isMobile;

  value: unknown = null;
  isOpen = false;
  panelWidth = 0;

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  get selectedOption(): SelectOption | undefined {
    return this.options.find((o) => o.value === this.value);
  }

  get selectedIndex(): number {
    return this.options.findIndex((o) => o.value === this.value);
  }

  // Desktop (CDK overlay)
  toggle(trigger: HTMLElement) {
    if (this.disabled) return;
    this.panelWidth = Math.max(trigger.offsetWidth, 192);
    this.isOpen = !this.isOpen;
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.onTouched();
  }

  select(option: SelectOption) {
    this.value = option.value;
    this.onChange(this.value);
    this.onTouched();
    this.isOpen = false;
  }

  // Mobile (native select)
  onNativeChange(event: Event) {
    const index = Number((event.target as HTMLSelectElement).value);
    const option = this.options[index];
    if (option) this.select(option);
  }

  writeValue(value: unknown): void {
    this.value = value ?? null;
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
