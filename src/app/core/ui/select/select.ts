import { Component, Input, booleanAttribute, computed, forwardRef, inject, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { I18nService } from '../../i18n/i18n.service';
import { DeviceDetectionService } from '../../services/device-detection.service';
import { Icon } from '../icon/icon';
import { ScrollArea } from '../scroll-area/scroll-area';

export interface SelectOption {
  label: string;
  value: string | number;
  section?: string; // consecutive options with the same section are grouped under it
}

interface SelectSection {
  label: string | undefined;
  options: SelectOption[];
}

@Component({
  selector: 'app-select',
  imports: [OverlayModule, Icon, ScrollArea],
  templateUrl: './select.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectField),
      multi: true,
    },
  ],
})
export class SelectField implements ControlValueAccessor {
  // Below the field, else above it (when there's no room below) — never pushed around, which
  // looped with the card's scroll.
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
  ];

  // Phones (iOS pop-up menus): over the chip, right-aligned with it, with the chosen item right
  // on the chip's middle line; if that doesn't fit the screen, growing down from the chip's top,
  // else up from its bottom. (Rows are 44px under a 6px padding — see the template.)
  // Worked out once on opening (a fresh array on every check would keep re-placing the menu).
  protected readonly phonePositions = signal<ConnectedPosition[]>([]);

  private placePhoneMenu(): void {
    const i = Math.max(0, this.options.findIndex((o) => o.value === this.value()));
    const toChosenMiddle = 6 + i * 44 + 22;
    this.phonePositions.set([
      { originX: 'end', originY: 'center', overlayX: 'end', overlayY: 'top', offsetY: -toChosenMiddle },
      { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'top', offsetY: -6 },
      { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'bottom', offsetY: 6 },
    ]);
  }

  @Input() disabled = false;
  @Input() options: SelectOption[] = [];
  /** The whole surrounding row (nearest positioned ancestor, e.g. a .list-row) opens the select. */
  @Input({ transform: booleanAttribute }) stretch = false;

  private deviceService = inject(DeviceDetectionService);
  private i18n = inject(I18nService);
  isMobile = this.deviceService.isMobile;

  readonly value = signal<string | number | null>(null);
  readonly isOpen = signal(false);

  private onChange: (value: string | number | null) => void = () => {};
  private onTouched: () => void = () => {};

  readonly triggerLabel = computed(() => {
    const v = this.value();
    const opt = this.options.find((o) => o.value === v);
    return opt ? opt.label : this.i18n.t('picker.select');
  });

  toggle(): void {
    if (this.disabled) return;
    if (!this.isOpen() && this.isMobile()) this.placePhoneMenu();
    this.isOpen.update((open) => !open);
  }

  close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.onTouched();
  }

  // Phone menu: the item under the finger (its box, for the sliding highlight). Short lists only
  // — long ones need the finger to scroll.
  readonly hover = signal<{ value: string; top: number; height: number } | null>(null);
  readonly dragPick = computed(() => this.options.length <= 8);

  // At most once per frame, and only when the finger reaches another item.
  private touchFrame = 0;
  private touchPoint: { x: number; y: number } | null = null;

  onTouch(e: TouchEvent): void {
    if (!this.dragPick()) return;
    const t = e.touches[0];
    this.touchPoint = { x: t.clientX, y: t.clientY };
    if (this.touchFrame) return;
    this.touchFrame = requestAnimationFrame(() => {
      this.touchFrame = 0;
      const p = this.touchPoint;
      if (!p) return;
      const el = (document.elementFromPoint(p.x, p.y) as HTMLElement | null)?.closest<HTMLElement>('[data-option]');
      const value = el?.dataset['value'] ?? null;
      if (value === (this.hover()?.value ?? null)) return;
      this.hover.set(el ? { value: value!, top: el.offsetTop, height: el.offsetHeight } : null);
    });
  }

  // Lifting the finger on an item picks it (and the tap's own click is skipped).
  onTouchEnd(e: TouchEvent): void {
    cancelAnimationFrame(this.touchFrame);
    this.touchFrame = 0;
    this.touchPoint = null;
    const h = this.hover();
    this.hover.set(null);
    if (!this.dragPick() || !h) return;
    const opt = this.options.find((o) => String(o.value) === h.value);
    if (!opt) return;
    e.preventDefault();
    this.select(opt);
  }

  select(opt: SelectOption): void {
    this.setValue(opt.value);
    this.isOpen.set(false);
  }

  // Options split into consecutive runs by `section`.
  sections(): SelectSection[] {
    const out: SelectSection[] = [];
    for (const opt of this.options) {
      const last = out.at(-1);
      if (last && last.label === opt.section) last.options.push(opt);
      else out.push({ label: opt.section, options: [opt] });
    }
    return out;
  }

  isSelected(opt: SelectOption): boolean {
    return this.value() === opt.value;
  }

  private setValue(v: string | number | null): void {
    this.value.set(v);
    this.onChange(v);
  }

  // ControlValueAccessor
  writeValue(v: string | number | null): void {
    this.value.set(v);
  }
  registerOnChange(fn: (value: string | number | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
