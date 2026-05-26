import { Component, forwardRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
// @Component({
//   selector: 'app-switch2',
//   standalone: true,
//   imports: [CommonModule],
//   template: `
//     <div
//       class="relative flex items-center w-[60px] h-[26px] rounded-full cursor-pointer transition-colors duration-300 shadow-inner"
//       [class.bg-[#34C759]]="checked"
//       [class.bg-[#E9E9EA]]="!checked"
//       (pointerdown)="onPointerDown()"
//     >
//       <div
//         class="absolute rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] flex items-center justify-center overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
//         [ngStyle]="{
//           'width': isPressed ? '54px' : '28px',
//           'height': isPressed ? '30px' : '18px',
//           'left': isPressed ? '3px' : (checked ? '29px' : '3px'),
//           'top': isPressed ? '-2px' : '4px'
//         }"
//       >
//         <div class="absolute inset-0 bg-white rounded-full transition-all duration-300"
//              [style.transform]="isAnimating ? 'scale(0.85)' : 'scale(1)'"
//              [class.opacity-100]="!isAnimating"
//              [class.opacity-0]="isAnimating">
//         </div>

//         <div class="absolute inset-0 bg-white/20 backdrop-blur-lg border border-white/50 rounded-full transition-opacity duration-300"
//              [class.opacity-0]="!isAnimating"
//              [class.opacity-100]="isAnimating">
//           <div class="absolute top-[2px] left-[15%] right-[15%] h-[40%] bg-gradient-to-b from-white/70 to-transparent rounded-full"></div>
//         </div>
//       </div>
//     </div>
//   `
// })
@Component({
  selector: 'app-switch2',
  standalone: true,
  imports: [CommonModule],
  template: `
<div
  class="absolute rounded-[14px] shadow-[0_2px_6px_rgba(0,0,0,0.25)] flex items-center justify-center overflow-hidden transition-all duration-200 ease-out"
  [ngStyle]="{
    'width': isPressed ? '56px' : '40px',
    'height': isPressed ? '32px' : '26px',
    'left': isPressed ? '2px' : (checked ? '18px' : '2px'),
    'top': isPressed ? '-3px' : '0px'
  }"
>
  <div 
    class="bg-white rounded-[10px] transition-all duration-200"
    [ngStyle]="{
      'width': '36px',
      'height': '44px',
      'position': 'absolute',
      'left': '2px', 
      'top': '2px',
      'opacity': isAnimating ? '0' : '1'
    }"
  ></div>

  <div class="absolute inset-0 bg-white/30 backdrop-blur-xl border border-white/60 rounded-[14px] transition-opacity duration-200"
       [class.opacity-0]="!isAnimating"
       [class.opacity-100]="isAnimating">
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

  onChange: any = () => { };
  onTouched: any = () => { };

  onPointerDown() {
    if (this.disabled) return;
    this.isPressed = true;
    this.isAnimating = true;
  }

  // ... внутри компонента ...

  @HostListener('window:pointerup')
  onPointerUp() {
    if (!this.isPressed) return;
    this.isPressed = false;
    this.checked = !this.checked;

    this.onChange(this.checked);
    this.onTouched();

    // Ускоряем выход: с 300мс до 150мс
    clearTimeout(this.animTimer);
    this.animTimer = setTimeout(() => {
      if (!this.isPressed) this.isAnimating = false;
    }, 150); // Теперь стекло исчезает почти мгновенно после отпускания
  }

  // В шаблоне для плавности используем более быстрый ease-out
  // transition-all duration-200 ease-out (вместо 300мс)

  writeValue(value: any): void { this.checked = !!value; }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void { this.disabled = isDisabled; }
}