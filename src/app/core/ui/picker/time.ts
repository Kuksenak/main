import { afterRenderEffect, Component, computed, ElementRef, model, signal, viewChildren } from '@angular/core';
import { desktop } from '../../device';

/**
 * A time, as the old app's: a chip with it ("09:30"). Phones: the system's own picker (iOS's
 * wheels); desktops: two narrow columns under the chip — the hours, the minutes (every 5) — the
 * chosen ones a gray fill, in the columns' middle as it opens. `[(value)]`: 'HH:mm' (null: none).
 */
@Component({
  selector: 'ui-time',
  host: { class: 'relative inline-flex' },
  templateUrl: './time.html',
})
export class UiTime {
  readonly value = model<string | null>(null);

  protected readonly desktop = desktop;
  protected readonly open = signal(false);
  protected readonly hours = Array.from({ length: 24 }, (_, i) => i);
  protected readonly minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  protected readonly hour = computed(() => (this.value() ? Number(this.value()!.slice(0, 2)) : null));
  protected readonly minute = computed(() => (this.value() ? Number(this.value()!.slice(3, 5)) : null));

  private readonly columns = viewChildren<ElementRef<HTMLElement>>('column');

  constructor() {
    // (opened: the chosen hour and minute in the columns' middle)
    afterRenderEffect(() => {
      if (!this.open()) return;
      for (const column of this.columns()) column.nativeElement.querySelector('[data-on]')?.scrollIntoView({ block: 'center' });
    });
  }

  protected pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  protected set(hour: number | null, minute: number | null): void {
    this.value.set(`${this.pad(hour ?? 9)}:${this.pad(minute ?? 0)}`);
  }

  protected typed(value: string): void {
    this.value.set(value || null);
  }
}
