import { Component, Input, computed, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { I18nService } from '../../i18n/i18n.service';
import { TranslatePipe } from '../../i18n/t.pipe';
import { DeviceDetectionService } from '../../services/device-detection.service';
import { Icon } from '../icon/icon';

interface DayCell {
  date: Date;
  inMonth: boolean;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

@Component({
  selector: 'app-date',
  imports: [OverlayModule, Icon, TranslatePipe],
  templateUrl: './date.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateField),
      multi: true,
    },
  ],
})
export class DateField implements ControlValueAccessor {
  // Below the field, else above it (when there's no room below) — never pushed around, which
  // looped with the card's scroll.
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
  ];

  @Input() disabled = false;

  private deviceService = inject(DeviceDetectionService);
  private i18n = inject(I18nService);

  isMobile = this.deviceService.isMobile;

  readonly value = signal<Date | null>(null);
  readonly view = signal(startOfMonth(new Date()));
  readonly isOpen = signal(false);

  private readonly today = new Date();

  readonly weekdays = this.i18n.weekdays;

  private onChange: (value: Date | null) => void = () => {};
  private onTouched: () => void = () => {};

  readonly triggerLabel = computed(() => {
    const v = this.value();
    return v
      ? v.toLocaleDateString(this.i18n.locale(), { day: 'numeric', month: 'short', year: 'numeric' })
      : this.i18n.t('picker.selectDate');
  });

  readonly monthLabel = computed(() =>
    this.view().toLocaleDateString(this.i18n.locale(), { month: 'long', year: 'numeric' }),
  );

  readonly weeks = computed<DayCell[][]>(() => {
    const monthStart = this.view();
    const month = monthStart.getMonth();
    const offset = (monthStart.getDay() + 6) % 7; // Mon = 0
    let cur = new Date(monthStart.getFullYear(), month, 1 - offset);

    const weeks: DayCell[][] = [];
    for (let w = 0; w < 6; w++) {
      const week: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        week.push({ date: cur, inMonth: cur.getMonth() === month });
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  });

  readonly nativeValue = computed(() => {
    const v = this.value();
    if (!v) return '';
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${v.getFullYear()}-${m}-${d}`;
  });

  // Desktop calendar
  toggle() {
    if (this.disabled) return;
    if (!this.isOpen()) this.view.set(startOfMonth(this.value() ?? new Date()));
    this.isOpen.update((open) => !open);
  }

  close() {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.onTouched();
  }

  prevMonth() {
    const v = this.view();
    this.view.set(new Date(v.getFullYear(), v.getMonth() - 1, 1));
  }

  nextMonth() {
    const v = this.view();
    this.view.set(new Date(v.getFullYear(), v.getMonth() + 1, 1));
  }

  selectDay(cell: DayCell) {
    this.setValue(cell.date);
    this.isOpen.set(false);
  }

  isSelected(d: Date): boolean {
    return this.sameDay(this.value(), d);
  }

  isToday(d: Date): boolean {
    return this.sameDay(this.today, d);
  }

  // Mobile native input
  onNativeChange(event: Event) {
    const v = (event.target as HTMLInputElement).value; // yyyy-mm-dd
    if (!v) {
      this.setValue(null);
      return;
    }
    const [y, m, d] = v.split('-').map(Number);
    this.setValue(new Date(y, m - 1, d));
  }

  private setValue(date: Date | null) {
    this.value.set(date);
    this.onChange(date);
    this.onTouched();
  }

  private sameDay(a: Date | null, b: Date): boolean {
    return (
      !!a &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  writeValue(value: Date | null): void {
    const valid = value instanceof Date && !isNaN(value.getTime());
    this.value.set(valid ? value : null);
    if (valid) this.view.set(startOfMonth(value));
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
