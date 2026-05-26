import { Component, forwardRef, Input, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-switch',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Switch),
      multi: true
    }
  ],
  template: `
    <div
      class="ios26-switch"
      [class.ios26-switch--checked]="checked"
      [class.ios26-switch--disabled]="disabled"
      [class.ios26-switch--expanded]="pressing || transitioning"
      [class.ios26-switch--glass]="transitioning"
      (mousedown)="onPressStart()"
      (touchstart)="onPressStart()"
      (click)="onToggle()"
      (mouseleave)="onPressCancel()"
      (touchcancel)="onPressCancel()"
    >
      <div class="ios26-switch__thumb"></div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      -webkit-tap-highlight-color: transparent;
    }

    .ios26-switch {
      position: relative;
      width: 51px;
      height: 24px;
      border-radius: 15.5px;
      cursor: pointer;
      background-color: #e9e9ea;
      transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.06);
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
    }

    .ios26-switch--checked {
      background-color: #34C759;
    }

    .ios26-switch--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Thumb — capsule / pill (wider than tall) */
    .ios26-switch__thumb {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: 3px;
      width: 30px;
      height: 19px;
      border-radius: 8.5px;
      background: #ffffff;
      box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.1),
        0 0.5px 1px rgba(0, 0, 0, 0.06),
        0 0 0 0.5px rgba(0, 0, 0, 0.04);
      transition:
        left 0.35s cubic-bezier(0.4, 0, 0.2, 1),
        width 0.2s cubic-bezier(0.25, 0.1, 0.25, 1),
        height 0.2s cubic-bezier(0.25, 0.1, 0.25, 1),
        border-radius 0.2s cubic-bezier(0.25, 0.1, 0.25, 1),
        background 0.2s ease,
        box-shadow 0.2s ease;
      z-index: 1;
    }

    /* Checked — thumb slides right */
    .ios26-switch--checked .ios26-switch__thumb {
      left: 18px; /* 51 - 26 - 3 */
    }

    /* -------- Expanded (pressing OR transitioning) -------- */
    .ios26-switch--expanded .ios26-switch__thumb {
      width: 33px;
      height: 26px;
      border-radius: 13px;
    }

    /* Expanded + checked — shift left so right edge stays aligned */
    .ios26-switch--checked.ios26-switch--expanded .ios26-switch__thumb {
      left: 15px; /* 51 - 33 - 3 */
    }

    /* -------- Glass effect (only during transition) -------- */
    .ios26-switch--glass .ios26-switch__thumb {
      background: rgba(255, 255, 255, 0.32);
      backdrop-filter: blur(16px) saturate(180%);
      -webkit-backdrop-filter: blur(16px) saturate(180%);
      box-shadow:
        0 1px 4px rgba(0, 0, 0, 0.06),
        inset 0 1px 2px rgba(255, 255, 255, 0.6),
        inset 0 -0.5px 1px rgba(0, 0, 0, 0.04),
        0 0 0 0.5px rgba(255, 255, 255, 0.45);
    }
  `]
})
export class Switch implements ControlValueAccessor, OnDestroy {
  @Input() disabled = false;
  checked = false;
  pressing = false;
  transitioning = false;
  private transitionTimer: any;

  onChange: any = () => {};
  onTouched: any = () => {};

  onPressStart() {
    if (this.disabled) return;
    this.pressing = true;
  }

  onToggle() {
    if (this.disabled) return;
    this.pressing = false;
    this.transitioning = true;
    this.checked = !this.checked;
    this.onChange(this.checked);
    this.onTouched();

    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    this.transitionTimer = setTimeout(() => {
      this.transitioning = false;
    }, 400);
  }

  onPressCancel() {
    this.pressing = false;
  }

  // Методы ControlValueAccessor
  writeValue(value: any): void {
    this.checked = !!value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  ngOnDestroy() {
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
  }
}
