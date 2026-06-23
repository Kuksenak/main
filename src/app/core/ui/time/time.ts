import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  computed,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { DeviceDetectionService } from '../../services/device-detection.service';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

const CLS_SELECTED = 'bg-[#0071eb] text-white font-semibold';
const CLS_CURRENT = 'text-[#0071eb] font-semibold hover:bg-black/5 dark:hover:bg-white/10';
const CLS_PLAIN = 'hover:bg-black/5 dark:hover:bg-white/10';

@Component({
  selector: 'app-time',
  imports: [OverlayModule],
  templateUrl: './time.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeField),
      multi: true,
    },
  ],
})
export class TimeField implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Select time…';
  @Input() disabled = false;

  // Minute granularity for the desktop picker (native input is unaffected).
  @Input() minuteStep = 5;

  private deviceService = inject(DeviceDetectionService);

  @ViewChild('hourCol') private hourCol?: ElementRef<HTMLElement>;
  @ViewChild('minuteCol') private minuteCol?: ElementRef<HTMLElement>;

  isMobile = this.deviceService.isMobile;

  // Value is an 'HH:mm' string (same format the native time input uses), or null.
  readonly value = signal<string | null>(null);
  readonly isOpen = signal(false);
  // Refreshed each time the picker opens, so "current" highlight stays accurate.
  readonly now = signal(new Date());

  readonly hours = Array.from({ length: 24 }, (_, i) => i);

  readonly minutes = computed(() => {
    const step = this.minuteStep > 0 ? this.minuteStep : 1;
    const arr: number[] = [];
    for (let m = 0; m < 60; m += step) arr.push(m);
    return arr;
  });

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  readonly selectedHour = computed(() => {
    const v = this.value();
    return v ? Number(v.split(':')[0]) : null;
  });

  readonly selectedMinute = computed(() => {
    const v = this.value();
    return v ? Number(v.split(':')[1]) : null;
  });

  // The row to highlight / scroll to: the chosen value, or "now" as a preview.
  readonly activeHour = computed(() => this.selectedHour() ?? this.now().getHours());
  readonly activeMinute = computed(() => this.selectedMinute() ?? this.currentStepMinute());

  readonly triggerLabel = computed(() => {
    const v = this.value();
    if (!v) return this.placeholder;
    const [h, m] = v.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  });

  // Desktop picker
  toggle(trigger: HTMLElement) {
    if (this.disabled) return;
    if (!this.isOpen()) this.now.set(new Date());
    this.isOpen.update((open) => !open);
  }

  onOpened() {
    // Scroll the active hour/minute into the middle of each column once rendered.
    setTimeout(() => {
      this.scrollActiveIntoView(this.hourCol?.nativeElement);
      this.scrollActiveIntoView(this.minuteCol?.nativeElement);
    });
  }

  close() {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.onTouched();
  }

  selectHour(h: number) {
    this.setValue(`${pad(h)}:${pad(this.selectedMinute() ?? this.currentStepMinute())}`);
  }

  selectMinute(m: number) {
    this.setValue(`${pad(this.selectedHour() ?? this.now().getHours())}:${pad(m)}`);
  }

  hourClass(h: number): string {
    if (this.selectedHour() === h) return CLS_SELECTED;
    if (h === this.now().getHours()) return CLS_CURRENT;
    return CLS_PLAIN;
  }

  minuteClass(m: number): string {
    if (this.selectedMinute() === m) return CLS_SELECTED;
    if (m === this.currentStepMinute()) return CLS_CURRENT;
    return CLS_PLAIN;
  }

  // Mobile native input
  onNativeChange(event: Event) {
    const v = (event.target as HTMLInputElement).value; // 'HH:mm' or ''
    this.setValue(v || null);
  }

  private currentStepMinute(): number {
    const step = this.minuteStep > 0 ? this.minuteStep : 1;
    const m = Math.round(this.now().getMinutes() / step) * step;
    return Math.min(m, 60 - step);
  }

  private scrollActiveIntoView(col?: HTMLElement) {
    if (!col) return;
    const active = col.querySelector<HTMLElement>('[data-active]');
    if (!active) return;
    col.scrollTop = active.offsetTop - col.clientHeight / 2 + active.clientHeight / 2;
  }

  private setValue(v: string | null) {
    this.value.set(v);
    this.onChange(v);
    this.onTouched();
  }

  // ControlValueAccessor
  writeValue(value: string | null): void {
    this.value.set(value ?? null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
