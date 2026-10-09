import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { SearchField } from '../core/ui/search-field';
import { Sheet } from '../core/ui/sheet/sheet';
import { initial } from '../core/utils/text';

export interface PickItem {
  id: string;
  name: string;
  color?: string | null; // avatar background (e.g. a group's color)
}

export interface PickSection {
  key: TranslationKey; // section header
  items: PickItem[];
}

/**
 * Pick any number of items: search + sections, a tap checks / unchecks (applied right away,
 * two-way bound `selected`). Mobile: a page sliding in (it has a search input); desktop: a
 * dropdown under `origin`.
 */
@Component({
  selector: 'app-pick-list',
  imports: [NgTemplateOutlet, Icon, PageSheet, ScrollArea, SearchField, Sheet, TranslatePipe],
  template: `
    <ng-template #search>
      <app-search-field [(value)]="query" />
    </ng-template>

    <ng-template #lists>
      @for (sec of visible(); track sec.key) {
        @if (sec.items.length) {
          <div class="flex flex-col gap-1.5">
            @if (sections().length > 1) {
              <span class="text-footnote opacity-50">{{ sec.key | t }}</span>
            }
            <div class="card">
              @for (item of sec.items; track item.id) {
                <button type="button" (click)="toggle(item.id)" class="list-row w-full py-2 text-left">
                  <span
                    class="avatar"
                    [class.text-[var(--accent-fg)]]="!!item.color"
                    [style.background]="item.color"
                  >{{ initial(item.name) }}</span>
                  <p class="min-w-0 flex-1 truncate">{{ item.name }}</p>
                  @if (selected().includes(item.id)) {
                    <app-icon name="check" class="size-5 text-[var(--accent)]" />
                  }
                </button>
              }
            </div>
          </div>
        }
      }
      @if (!hasResults()) {
        <p class="text-body py-6 text-center opacity-40">{{ 'students.notFound' | t }}</p>
      }
    </ng-template>

    @if (desktop) {
      <app-sheet [origin]="origin()" (closed)="closed.emit()">
        <div class="flex min-h-0 flex-col gap-3">
          <ng-container [ngTemplateOutlet]="search" />
          <app-scroll-area class="max-h-80 min-h-0" contentClass="gap-3">
            <ng-container [ngTemplateOutlet]="lists" />
          </app-scroll-area>
        </div>
      </app-sheet>
    } @else {
      <app-page-sheet [title]="title()" [actions]="false" [scroll]="false" (closed)="closed.emit()">
        <div class="flex min-h-0 flex-1 flex-col gap-4">
          <ng-container [ngTemplateOutlet]="search" />
          <app-scroll-area class="min-h-0 flex-1" contentClass="gap-6">
            <ng-container [ngTemplateOutlet]="lists" />
          </app-scroll-area>
        </div>
      </app-page-sheet>
    }
  `,
})
export class PickList {
  readonly title = input(''); // mobile page title
  readonly sections = input.required<PickSection[]>();
  readonly selected = model.required<string[]>();
  readonly origin = input<HTMLElement | null>(null);
  readonly closed = output<void>();

  private i18n = inject(I18nService);
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();

  protected readonly query = signal('');

  // Each section filtered by the search, alphabetical.
  protected readonly visible = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    return this.sections().map((sec) => ({
      key: sec.key,
      items: sec.items
        .filter((i) => !q || i.name.toLocaleLowerCase().includes(q))
        .sort((a, b) => a.name.localeCompare(b.name, this.i18n.locale())),
    }));
  });

  protected readonly hasResults = computed(() => this.visible().some((s) => s.items.length));

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
  }

  protected toggle(id: string): void {
    this.selected.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }
}
