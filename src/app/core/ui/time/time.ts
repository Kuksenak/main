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

const CLS_SELECTED = 'option option-selected';
const CLS_CURRENT = 'option option-current';
const CLS_PLAIN = 'option';

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
  // Below the field, else above it (when there's no room below) — never pushed around, which
  // looped with the card's scroll.
  // Centered on the chip (iOS): the chosen time, scrolled to the columns' middle, lands right
  // under the pointer. Near the window's edge: below / above the chip instead.
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

  // Keep the scroll position within the middle copies for a seamless loop.
  onColScroll(el: HTMLElement): void {
    const block = el.scrollHeight / this.loopCount;
    if (block <= 0) return;
    if (el.scrollTop < block) {
      el.scrollTop += block;
    } else if (el.scrollTop > block * (this.loopCount - 1)) {
      el.scrollTop -= block;
    }
  }

  // Wheel: the default (~100px a notch) flies past several items. A mouse notch moves one row,
  // smoothly; trackpads (small deltas) scroll at half speed.
  onWheel(e: WheelEvent, el: HTMLElement): void {
    e.preventDefault();
    const dy = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * 16 : e.deltaY;
    if (Math.abs(dy) >= 40) {
      const row = (el.firstElementChild as HTMLElement | null)?.offsetHeight ?? 30;
      el.scrollBy({ top: Math.sign(dy) * (row + 1), behavior: 'smooth' });
    } else {
      el.scrollTop += dy * 0.5;
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
    const actives = col.querySelectorAll<HTMLElement>('[data-active]');
    if (!actives.length) return;
    // Center the active item from a middle copy so there's room to loop both ways.
    const active = actives[Math.floor(actives.length / 2)];
    col.scrollTop = active.offsetTop - col.clientHeight / 2 + active.clientHeight / 2;
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
