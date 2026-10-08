import { Component, OnInit, input, signal } from '@angular/core';
import { Icon } from '../icon/icon';

const STORAGE_KEY = 'sections';

/**
 * Collapsible list section: a small uppercase header (title · count · chevron) above its
 * content. Tapping the header folds it. With `key`, the open/closed state is remembered on this
 * device per key (e.g. every "Past" list stays folded once you fold one).
 *
 *   <app-section title="Members" [count]="n" key="members"> <div class="card">…</div> </app-section>
 */
@Component({
  selector: 'app-section',
  imports: [Icon],
  host: { class: 'flex flex-col gap-1.5' },
  template: `
    <button type="button" (click)="toggle()" class="section-header" [attr.aria-expanded]="open()">
      <span class="truncate">{{ title() }}</span>
      @if (count() !== null) {
        <span class="tabular-nums">· {{ count() }}</span>
      }
      <app-icon name="chevron-right" class="row-chevron ml-auto !opacity-100 transition-transform duration-200" [class.rotate-90]="open()" />
    </button>
    @if (open()) {
      <ng-content />
    }
  `,
})
export class Section implements OnInit {
  readonly title = input.required<string>();
  readonly count = input<number | null>(null);
  readonly key = input<string>(''); // remember open/closed per key
  readonly initiallyOpen = input(true);

  protected readonly open = signal(true);

  ngOnInit(): void {
    const saved = this.key() ? Section.read()[this.key()] : undefined;
    this.open.set(saved ?? this.initiallyOpen());
  }

  protected toggle(): void {
    this.open.update((o) => !o);
    if (!this.key()) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...Section.read(), [this.key()]: this.open() }));
    } catch {
      /* storage unavailable — state lasts for this view only */
    }
  }

  private static read(): Record<string, boolean> {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  }
}
