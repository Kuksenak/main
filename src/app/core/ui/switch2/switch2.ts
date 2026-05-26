import { Component, forwardRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
@Component({
  selector: 'app-switch2',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="relative flex items-center w-[60px] h-[26px] rounded-full cursor-pointer transition-colors duration-300 shadow-inner"
      [class.bg-[#34C759]]="checked"
      [class.bg-[#E9E9EA]]="!checked"
      (pointerdown)="onPointerDown()"
    >
      <div
        class="absolute rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 ease-out shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
        [ngStyle]="{
          'width': isPressed ? '50px' : '30px',
          'height': isPressed ? '32px' : '20px',
          'left': isPressed ? '5px' : (checked ? '26px' : '3px'),
          'top': isPressed ? '-3px' : '3px'
        }"
      >
        <div class="absolute inset-0 bg-white rounded-full transition-opacity duration-300"
             [class.opacity-100]="!isAnimating"
             [class.opacity-0]="isAnimating">
        </div>

        <div class="absolute inset-0 bg-white/40 backdrop-blur-md border border-white/60 rounded-full transition-opacity duration-300"
             [class.opacity-0]="!isAnimating"
             [class.opacity-100]="isAnimating">
          <div class="absolute top-0 left-[15%] right-[15%] h-[40%] bg-gradient-to-b from-white/90 to-transparent rounded-full"></div>
        </div>
      </div>
    </div>
  `
})
export class SwitchComponent implements ControlValueAccessor {
  checked = false;
  disabled = false;
  isPressed = false;
  isAnimating = false;
  private animTimer: any;

  onChange: any = () => {};
  onTouched: any = () => {};

  onPointerDown() {
    if (this.disabled) return;
    this.isPressed = true;
    this.isAnimating = true; 
  }

  @HostListener('window:pointerup')
  onPointerUp() {
    if (!this.isPressed) return;
    this.isPressed = false; 
    this.checked = !this.checked; 
    
    this.onChange(this.checked);
    this.onTouched();

    clearTimeout(this.animTimer);
    this.animTimer = setTimeout(() => {
      if (!this.isPressed) this.isAnimating = false;
    }, 300);
  }

  writeValue(value: any): void { this.checked = !!value; }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }
}