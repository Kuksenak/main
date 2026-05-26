import { Component, forwardRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-switch2',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SwitchComponent),
      multi: true
    }
  ],
  template: `
    <div
      class="relative flex items-center w-[52px] h-[32px] rounded-full cursor-pointer transition-colors duration-300 select-none shadow-inner"
      [class.bg-[#34C759]]="checked"
      [class.bg-[#E9E9EA]]="!checked"
      [class.opacity-50]="disabled"
      (pointerdown)="onPointerDown()"
    >
      <div
        class="absolute rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15),_0_3px_1px_rgba(0,0,0,0.06)] flex items-center justify-center overflow-hidden transition-all duration-300 ease-out"
        [ngStyle]="{
          'width': isPressed ? '44px' : '34px',
          'height': isPressed ? '30px' : '28px',
          'top': isPressed ? '1px' : '2px',
          'left': '2px',
          'transform': checked 
            ? (isPressed ? 'translateX(4px)' : 'translateX(14px)') 
            : 'translateX(0)'
        }"
      >
        <div
          class="absolute inset-0 bg-white transition-opacity duration-200 rounded-full"
          [class.opacity-100]="!isAnimating"
          [class.opacity-0]="isAnimating"
        ></div>

        <div
          class="absolute inset-0 transition-opacity duration-200 rounded-full"
          [class.opacity-0]="!isAnimating"
          [class.opacity-100]="isAnimating"
        >
          <div class="absolute inset-0 bg-white/20 backdrop-blur-md rounded-full"></div>
          
          <div class="absolute inset-0 rounded-full shadow-[inset_0_4px_8px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.15)]"></div>
          
          <div class="absolute inset-0 rounded-full border border-white/60"></div>
          
          <div class="absolute top-[1px] left-[15%] right-[15%] h-[8px] bg-gradient-to-b from-white/95 to-transparent rounded-full opacity-90 pointer-events-none"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      -webkit-tap-highlight-color: transparent;
      touch-action: none; 
    }
  `]
})
export class SwitchComponent implements ControlValueAccessor {
  checked = false;
  disabled = false;

  isPressed = false;
  isAnimating = false;

  private animTimer: any;

  onChange: any = () => { };
  onTouched: any = () => { };

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
      if (!this.isPressed) {
        this.isAnimating = false;
      }
    }, 300);
  }

  writeValue(value: any): void { this.checked = !!value; }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }
}