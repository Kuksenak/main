import { Component, Input, computed, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { I18nService } from '../../i18n/i18n.service';
import { DeviceDetectionService } from '../../services/device-detection.service';
import { Icon } from '../icon/icon';

export interface SelectOption {
  label: string;
  value: string | number;
}

@Component({
  selector: 'app-select',
  imports: [OverlayModule, Icon],
  templateUrl: './select.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectField),
      multi: true,
    },
  ],
})
export class SelectField implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = ''; // defaults to the translated 'Select…'
  @Input() disabled = false;
  @Input() options: SelectOption[] = [];

  private deviceService = inject(DeviceDetectionService);
  private i18n = inject(I18nService);
  isMobile = this.deviceService.isMobile;

  readonly value = signal<string | number | null>(null);
  readonly isOpen = signal(false);

  private onChange: (value: string | number | null) => void = () => {};
  private onTouched: () => void = () => {};

  readonly triggerLabel = computed(() => {
    const v = this.value();
    const opt = this.options.find((o) => o.value === v);
    return opt ? opt.label : this.placeholder || this.i18n.t('picker.select');
  });

  toggle(): void {
    if (this.disabled) return;
    this.isOpen.update((open) => !open);
  }

  close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.onTouched();
  }

  select(opt: SelectOption): void {
    this.setValue(opt.value);
    this.isOpen.set(false);
  }

  isSelected(opt: SelectOption): boolean {
    return this.value() === opt.value;
  }

  // Mobile native select
  onNativeChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const opt = this.options.find((o) => String(o.value) === raw);
    this.setValue(opt ? opt.value : null);
  }

  private setValue(v: string | number | null): void {
    this.value.set(v);
    this.onChange(v);
  }

  // ControlValueAccessor
  writeValue(v: string | number | null): void {
    this.value.set(v);
  }
  registerOnChange(fn: (value: string | number | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
