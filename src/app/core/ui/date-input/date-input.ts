import { Component, Input, forwardRef, ElementRef, ViewChild, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-date-input',
  imports: [],
  templateUrl: './date-input.html',
  styleUrl: './date-input.scss',
  host: {
    style: 'display: inline-flex;'
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateInput),
      multi: true,
    },
  ],
})
export class DateInput implements ControlValueAccessor {
  @Input() placeholder = 'dd/mm/yyyy';
  @Input() disabled = false;
  @ViewChild('dateInput', { static: false }) dateInputRef?: ElementRef<HTMLInputElement>;

  value = '';
  private isPickerOpen = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInside = this.dateInputRef?.nativeElement.contains(target);

    // If clicked outside and picker is open, close it
    if (!clickedInside && this.isPickerOpen) {
      this.closePicker();
    }
  }

  onInput(event: Event) {
    if (this.disabled) return;

    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
    this.onTouched();
  }

  onClick(event: Event) {
    if (this.disabled) return;

    event.stopPropagation();
    const target = event.target as HTMLInputElement;

    try {
      // Open native date picker
      target.showPicker?.();
      this.isPickerOpen = true;
    } catch (error) {
      // Fallback if showPicker is not supported
      console.log('showPicker not supported');
    }
  }

  private closePicker() {
    this.dateInputRef?.nativeElement.blur();
    this.isPickerOpen = false;
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
