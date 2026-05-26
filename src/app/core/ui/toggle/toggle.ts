import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, inject, HostBinding } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: Toggle,
      multi: true
    }
  ],
  template: `
    <div
      class="toggle"
      role="switch"
      [attr.aria-checked]="checked"
      [attr.aria-disabled]="disabled"
      [class.toggle--checked]="checked"
      [class.toggle--disabled]="disabled"
      [style.--toggle-bg-on]="colorOn"
      [style.--toggle-bg-off]="colorOff"
      (click)="onToggle(); $event.stopPropagation()"
    >
      <div class="toggle__thumb"></div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      --toggle-bg-off: #e5e5ea;
      --toggle-bg-on: var(--app-accent, #3b82f6);
      --travel: 18px;
    }

    :host(.disabled) {
      pointer-events: none;
    }

    .toggle {
      position: relative;
      width: 62px;
      height: 28px;
      border-radius: 14px;
      background-color: var(--toggle-bg-off);
      cursor: pointer;
      transition: background-color 0.25s ease;
    }

    .toggle--checked {
      background-color: var(--toggle-bg-on);
    }

    .toggle--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .toggle__thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 40px;
      height: 24px;
      border-radius: 12px;
      background: #ffffff;
      will-change: transform;
      transition: transform 0.25s cubic-bezier(0.25, 1, 0.5, 1);
    }

    .toggle--checked .toggle__thumb {
      transform: translateX(var(--travel));
    }
  `]
})
export class Toggle implements ControlValueAccessor {
  private cdr = inject(ChangeDetectorRef);

  @Input() disabled = false;
  @Input() colorOn = 'var(--app-accent, #3b82f6)';
  @Input() colorOff = '#e5e5ea';

  @Input()
  set checked(value: boolean) {
    this._checked = value;
    this.cdr.markForCheck();
  }
  get checked(): boolean { return this._checked; }
  private _checked = false;

  @Output() checkedChange = new EventEmitter<boolean>();

  @HostBinding('class.disabled') get isDisabled() { return this.disabled; }

  onChange: any = () => {};
  onTouched: any = () => {};

  onToggle() {
    if (this.disabled) return;
    this._checked = !this._checked;
    this.checkedChange.emit(this._checked);
    this.onChange(this._checked);
    this.onTouched();
  }

  writeValue(value: any): void {
    this._checked = !!value;
    this.cdr.markForCheck();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }
}
