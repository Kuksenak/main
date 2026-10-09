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
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { I18nService } from '../../i18n/i18n.service';
import { DeviceDetectionService } from '../../services/device-detection.service';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

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
  // Centered on the chip (iOS): the band with the chosen time lands right under the pointer.
  // Near the window's edge: below / above the chip instead (never pushed around, which looped
  // with the card's scroll).
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'center', originY: 'center', overlayX: 'center', overlayY: 'center' },
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
  ];

  @Input() disabled = false;
  @Input() minuteStep = 5;

  private deviceService = inject(DeviceDetectionService);
  private i18n = inject(I18nService);

  @ViewChild('hourCol') private hourCol?: ElementRef<HTMLElement>;
  @ViewChild('minuteCol') private minuteCol?: ElementRef<HTMLElement>;

  isMobile = this.deviceService.isMobile;

  readonly value = signal<string | null>(null);
  readonly isOpen = signal(false);
  readonly now = signal(new Date());
  readonly activeCol = signal<'h' | 'm'>('h');

  readonly hours = Array.from({ length: 24 }, (_, i) => i);

  readonly minutes = computed(() => {
    const step = this.minuteStep > 0 ? this.minuteStep : 1;
    const arr: number[] = [];
    for (let m = 0; m < 60; m += step) arr.push(m);
    return arr;
  });

  // Looping lists: the base sequence repeated, so scrolling never hits an end.
  readonly loopCount = 5;
  readonly loopHours = computed(() => {
    const out: number[] = [];
    for (let i = 0; i < this.loopCount; i++) out.push(...this.hours);
    return out;
  });
  readonly loopMinutes = computed(() => {
    const base = this.minutes();
    const out: number[] = [];
    for (let i = 0; i < this.loopCount; i++) out.push(...base);
    return out;
  });

  // Wheels: rows of ROW px, the column padded so any row can sit in the middle band — the row
  // there is index scrollTop / ROW.
  private static readonly ROW = 32;
  readonly centerH = signal<number | null>(null);
  readonly centerM = signal<number | null>(null);
  private settle: Record<'h' | 'm', ReturnType<typeof setTimeout> | undefined> = { h: undefined, m: undefined };

  onColScroll(el: HTMLElement, col: 'h' | 'm'): void {
    // Keep within the middle copies for a seamless loop (a whole block: the same row stays put).
    const block = (el.children.length / this.loopCount) * TimeField.ROW;
    if (block > 0) {
      if (el.scrollTop < block) el.scrollTop += block;
      else if (el.scrollTop > block * (this.loopCount - 1)) el.scrollTop -= block;
    }
    const index = Math.round(el.scrollTop / TimeField.ROW);
    (col === 'h' ? this.centerH : this.centerM).set(index);
    // Once it stops: what's in the band is the time.
    clearTimeout(this.settle[col]);
    this.settle[col] = setTimeout(() => this.pick(col, index), 140);
  }

  /** A click on a row: roll it into the band (picked when it stops there). */
  scrollTo(el: HTMLElement, index: number): void {
    el.scrollTo({ top: index * TimeField.ROW, behavior: 'smooth' });
  }

  private pick(col: 'h' | 'm', index: number): void {
    if (col === 'h') {
      const h = this.loopHours()[index];
      if (h !== undefined && h !== this.activeHour()) this.selectHour(h);
    } else {
      const m = this.loopMinutes()[index];
      if (m !== undefined && m !== this.activeMinute()) this.selectMinute(m);
    }
  }

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

  readonly activeHour = computed(() => this.selectedHour() ?? this.now().getHours());
  readonly activeMinute = computed(() => this.selectedMinute() ?? this.currentStepMinute());

  readonly triggerLabel = computed(() => {
    const v = this.value();
    if (!v) return this.i18n.t('picker.selectTime');
    const [h, m] = v.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString(this.i18n.locale(), { hour: '2-digit', minute: '2-digit' });
  });

  // Desktop picker
  toggle() {
    if (this.disabled) return;
    if (!this.isOpen()) this.now.set(new Date());
    this.isOpen.update((open) => !open);
  }

  onOpened() {
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

  // Keyboard: ↑/↓ change the active column, ←/→ switch between hours and minutes.
  onKeydown(e: KeyboardEvent) {
    if (!this.isOpen()) return;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        this.activeCol.set('h');
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.activeCol.set('m');
        break;
      case 'ArrowUp':
      case 'ArrowDown': {
        e.preventDefault();
        const dir = e.key === 'ArrowUp' ? -1 : 1;
        if (this.activeCol() === 'h') {
          this.selectHour(((this.activeHour() + dir) % 24 + 24) % 24);
          setTimeout(() => this.scrollActiveIntoView(this.hourCol?.nativeElement));
        } else {
          const mins = this.minutes();
          const idx = Math.max(0, mins.indexOf(this.activeMinute()));
          this.selectMinute(mins[(idx + dir + mins.length) % mins.length]);
          setTimeout(() => this.scrollActiveIntoView(this.minuteCol?.nativeElement));
        }
        break;
      }
      case 'Enter':
        e.preventDefault();
        this.close();
        break;
    }
  }

  selectHour(h: number) {
    this.setValue(`${pad(h)}:${pad(this.selectedMinute() ?? this.currentStepMinute())}`);
  }

  selectMinute(m: number) {
    this.setValue(`${pad(this.selectedHour() ?? this.now().getHours())}:${pad(m)}`);
  }

  // Mobile native input
  onNativeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const v = input.value; // 'HH:mm' or ''
    if (!v) {
      // Native picker "Reset" clears the field — keep the value it was opened with.
      input.value = this.value() ?? '';
      return;
    }
    this.setValue(v);
  }

  private currentStepMinute(): number {
    const step = this.minuteStep > 0 ? this.minuteStep : 1;
    const m = Math.round(this.now().getMinutes() / step) * step;
    return Math.min(m, 60 - step);
  }

  private scrollActiveIntoView(col?: HTMLElement) {
    if (!col) return;
    const rows = Array.from(col.children);
    const actives = rows.filter((r) => r.hasAttribute('data-active'));
    if (!actives.length) return;
    // Into the band, from a middle copy so there's room to loop both ways.
    const index = rows.indexOf(actives[Math.floor(actives.length / 2)]);
    col.scrollTop = index * TimeField.ROW;
  }

  private setValue(v: string | null) {
    this.value.set(v);
    this.onChange(v);
    this.onTouched();
  }

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
