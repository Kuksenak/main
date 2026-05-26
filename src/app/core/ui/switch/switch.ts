import { Component, forwardRef, Input, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-switch',
  standalone: true,
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
      [class.ios26-switch--switching-right]="switchDirection === 'right'"
      [class.ios26-switch--switching-left]="switchDirection === 'left'"
      [class.ios26-switch--small]="size === 'small'"
      [class.ios26-switch--large]="size === 'large'"
      [style.--switch-bg-on]="colorOn"
      [style.--switch-bg-off]="colorOff"
      (mousedown)="onPressStart()"
      (touchstart)="onPressStart()"
      (click)="onToggle()"
      (mouseleave)="onPressCancel()"
      (touchcancel)="onPressCancel()"
    >
      <div class="ios26-switch__thumb">
        <!-- Opaque white thumb for static state -->
        <div 
          class="ios26-switch__thumb-solid"
          [class.ios26-switch__thumb-solid--hidden]="pressing || transitioning"
        ></div>
        
        <!-- Premium glass thumb for transitioning/pressing state -->
        <div 
          class="ios26-switch__thumb-glass"
          [class.ios26-switch__thumb-glass--visible]="pressing || transitioning"
        >
          <!-- Specular Curved gloss reflection from switch2's premium preset -->
          <div class="ios26-switch__thumb-shine"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      -webkit-tap-highlight-color: transparent;
      --switch-width: 64px;
      --switch-height: 27px;
      --switch-padding: 1.5px;
      --switch-bg-off: #d1d1d6;
      --switch-bg-on: #34C759;
      --thumb-width: 42px;
      --thumb-height: 23px;
      --thumb-width-expanded: 52px;
      --thumb-height-expanded: 28px;
    }

    .ios26-switch {
      position: relative;
      width: var(--switch-width);
      height: var(--switch-height);
      border-radius: calc(var(--switch-height) / 2);
      cursor: pointer;
      background-color: var(--switch-bg-off);
      transition: background-color 0.3s ease;
      touch-action: manipulation;
      user-select: none;
      -webkit-user-select: none;
    }

    .ios26-switch--checked {
      background-color: var(--switch-bg-on);
    }

    .ios26-switch--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Thumb wrapper — capsule / pill */
    .ios26-switch__thumb {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: var(--switch-padding);
      width: var(--thumb-width);
      height: var(--thumb-height);
      border-radius: calc(var(--thumb-height) / 2);
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
      transition:
        left 0.3s ease-out,
        width 0.25s ease-out,
        height 0.25s ease-out,
        box-shadow 0.25s ease-out;
      z-index: 2;
    }

    /* Checked — thumb slides right */
    .ios26-switch--checked .ios26-switch__thumb {
      left: calc(var(--switch-width) - var(--thumb-width) - var(--switch-padding));
    }

    /* -------- Expanded (pressing OR transitioning) -------- */
    .ios26-switch--expanded .ios26-switch__thumb {
      width: var(--thumb-width-expanded);
      height: var(--thumb-height-expanded);
      border-radius: calc(var(--thumb-height-expanded) / 2);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
    }

    /* Expanded + unchecked — stays at left */
    .ios26-switch--expanded:not(.ios26-switch--checked) .ios26-switch__thumb {
      left: calc(var(--switch-padding) - 1px);
    }

    /* Expanded + checked — stays at right */
    .ios26-switch--checked.ios26-switch--expanded .ios26-switch__thumb {
      left: calc(var(--switch-width) - var(--thumb-width-expanded) - var(--switch-padding) + 1px);
    }

    /* Switching animations based on direction */
    .ios26-switch--switching-right.ios26-switch--expanded .ios26-switch__thumb {
      animation: overshoot-right 0.45s ease-out;
    }

    .ios26-switch--switching-left.ios26-switch--expanded .ios26-switch__thumb {
      animation: overshoot-left 0.45s ease-out;
    }

    /* Overshoot animations */
    @keyframes overshoot-right {
      0% {
        left: calc(var(--switch-padding) - 1px);
        width: var(--thumb-width);
        height: var(--thumb-height);
      }
      60% {
        left: calc(var(--switch-width) - var(--thumb-width) - var(--switch-padding) - 5px);
        width: var(--thumb-width-expanded);
        height: var(--thumb-height-expanded);
      }
      100% {
        left: calc(var(--switch-width) - var(--thumb-width) - var(--switch-padding) + 1px);
        width: var(--thumb-width);
        height: var(--thumb-height);
      }
    }

    @keyframes overshoot-left {
      0% {
        left: calc(var(--switch-width) - var(--thumb-width) - var(--switch-padding) + 1px);
        width: var(--thumb-width);
        height: var(--thumb-height);
      }
      60% {
        left: calc(var(--switch-padding) - 5px);
        width: var(--thumb-width-expanded);
        height: var(--thumb-height-expanded);
      }
      100% {
        left: calc(var(--switch-padding) - 1px);
        width: var(--thumb-width);
        height: var(--thumb-height);
      }
    }

    /* -------- Opaque White Layer -------- */
    .ios26-switch__thumb-solid {
      position: absolute;
      inset: 0;
      background: #ffffff;
      border-radius: inherit;
      opacity: 1;
      transition: opacity 0.2s ease;
    }

    .ios26-switch__thumb-solid--hidden {
      opacity: 0;
    }

    /* -------- Glassmorphism Layer -------- */
    .ios26-switch__thumb-glass {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: rgba(255, 255, 255, 0.4);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.5);
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .ios26-switch__thumb-glass--visible {
      opacity: 1;
    }

    /* Curved specular gradient shine */
    .ios26-switch__thumb-shine {
      position: absolute;
      top: 1.5px;
      left: 15%;
      right: 15%;
      height: 35%;
      background: linear-gradient(to bottom, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0));
      border-radius: 9999px;
    }

    /* -------- Size Variants -------- */
    .ios26-switch--small {
      --switch-width: 54px;
      --switch-height: 26px;
      --switch-padding: 2.5px;
      --thumb-width: 34px;
      --thumb-height: 21px;
      --thumb-width-expanded: 42px;
      --thumb-height-expanded: 25px;
    }

    .ios26-switch--large {
      --switch-width: 74px;
      --switch-height: 36px;
      --switch-padding: 3.5px;
      --thumb-width: 46px;
      --thumb-height: 29px;
      --thumb-width-expanded: 56px;
      --thumb-height-expanded: 34px;
    }
  `]
})
export class Switch implements ControlValueAccessor, OnDestroy {
  @Input() disabled = false;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() colorOn = '#34C759';
  @Input() colorOff = '#d1d1d6';

  checked = false;
  pressing = false;
  transitioning = false;
  switchDirection: 'left' | 'right' | null = null;
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

    // Determine switch direction BEFORE changing state
    this.switchDirection = this.checked ? 'left' : 'right';

    this.checked = !this.checked;
    this.onChange(this.checked);
    this.onTouched();

    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    this.transitionTimer = setTimeout(() => {
      this.transitioning = false;
      this.switchDirection = null;
    }, 450);
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