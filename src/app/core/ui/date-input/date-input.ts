import { Component, Input, forwardRef, ElementRef, ViewChild, HostListener } from '@angular/core';
import { ControlValueAccessor, FormBuilder, FormGroup, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-date-input',
  imports: [],
  templateUrl: './date-input.html',
  styleUrl: './date-input.scss',
  host: {
    style: ''
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
  // Получаем ссылку на HTML-инпут
  @ViewChild('datepicker') datepicker!: ElementRef<HTMLInputElement>;

  nativeValue: string = '';
  formattedDate: string = '';
  disabled: boolean = false;

  onChange: (value: Date | null) => void = () => {};
  onTouched: () => void = () => {};

  // Метод для принудительного открытия календаря
  openPicker(): void {
    if (this.disabled) return;
    
    const inputEl = this.datepicker.nativeElement;
    
    // Проверяем, поддерживает ли браузер современный метод showPicker
    if (typeof inputEl.showPicker === 'function') {
      inputEl.showPicker();
    } else {
      // Фолбек для совсем старых браузеров
      inputEl.click();
    }
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;

    if (value) {
      const date = new Date(value);
      this.nativeValue = value;
      this.formattedDate = this.formatToUserFriendly(date);
      this.onChange(date);
    } else {
      this.nativeValue = '';
      this.formattedDate = '';
      this.onChange(null);
    }
  }

  // --- ControlValueAccessor ---
  writeValue(value: Date | null): void {
    if (value instanceof Date && !isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      
      this.nativeValue = `${year}-${month}-${day}`;
      this.formattedDate = this.formatToUserFriendly(value);
    } else {
      this.nativeValue = '';
      this.formattedDate = '';
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState?(isDisabled: boolean): void { this.disabled = isDisabled; }

  private formatToUserFriendly(date: Date): string {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}