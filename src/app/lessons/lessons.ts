import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, TemplateRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { EventList } from '../cards/event-list';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { NavStack } from '../core/services/nav-stack.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { SearchField } from '../core/ui/search-field';
import { LessonContent } from './lesson-content';
import { Lesson, LessonService } from './lesson.service';

/**
 * The lesson library. Mobile: the list (search in the toolbar), a tap opens the lesson card.
 * Desktop: the list on the left, the picked lesson's content on the right (Edit opens the card).
 */
@Component({
  selector: 'app-lessons',
  imports: [NgTemplateOutlet, EventList, Icon, LessonContent, ScrollArea, SearchField, TranslatePipe],
  template: `
    <ng-template #search>
      <app-search-field [(value)]="query" />
    </ng-template>

    <main class="flex min-h-0 w-full flex-1 flex-col gap-3 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 desktop:flex-row desktop:gap-6">
      <!-- Bottom padding keeps the list clear of the floating button -->
      <section class="flex min-h-0 w-full flex-1 flex-col gap-3 pb-14 desktop:max-w-md">
        <div class="mobile:hidden"><ng-container [ngTemplateOutlet]="search" /></div>

        @if (visible().length) {
          <app-scroll-area class="min-h-0 shrink" viewportClass="card">
            @for (l of visible(); track l.id) {
              <button type="button" (click)="pick(l)" class="list-row w-full py-2 text-left">
                <div class="min-w-0 flex-1 leading-tight">
                  <p class="truncate font-medium" [class.font-bold]="desktop && l.id === selected()?.id">{{ l.title }}</p>
                  @if (summary(l); as s) {
                    <p class="text-footnote truncate opacity-50">{{ s }}</p>
                  }
                </div>
                <app-icon name="chevron-right" class="row-chevron desktop:hidden" />
              </button>
            }
          </app-scroll-area>
        } @else {
          <div class="flex flex-1 items-center justify-center">
            <p class="text-body opacity-40">{{ (query() ? 'students.notFound' : 'lessons.empty') | t }}</p>
          </div>
        }
      </section>

      <!-- Desktop: the picked lesson -->
      <section class="flex min-h-0 flex-1 flex-col mobile:hidden">
        @if (selected(); as l) {
          <div class="flex items-center gap-4">
            <h1 class="min-w-0 flex-1 truncate text-2xl font-semibold">{{ l.title }}</h1>
            <button type="button" (click)="stack.push({ kind: 'lesson', id: l.id })" class="btn-secondary">{{ 'action.edit' | t }}</button>
          </div>
          <app-scroll-area class="mt-6 min-h-0 flex-1" contentClass="gap-6 pb-14">
            <app-lesson-content [blocks]="l.blocks" />
            <app-event-list [lessonId]="l.id" />
          </app-scroll-area>
        } @else {
          <div class="flex flex-1 items-center justify-center">
            <p class="text-body opacity-40">{{ 'lessons.selectHint' | t }}</p>
          </div>
        }
      </section>
    </main>

    <button type="button" (click)="stack.push({ kind: 'lesson', id: null })" [attr.aria-label]="'lessons.add' | t" class="btn-confirm float-bottom right-4">
      <app-icon name="plus" [strokeWidth]="2" class="size-7 desktop:size-6" />
    </button>
  `,
})
export class Lessons {
  private service = inject(LessonService);
  private i18n = inject(I18nService);
  protected stack = inject(NavStack);
  private readonly search = viewChild<TemplateRef<unknown>>('search');

  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly query = signal('');

  // Alphabetical, filtered by title and text.
  protected readonly visible = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    const has = (v: string | null) => !!v && v.toLocaleLowerCase().includes(q);
    return [...this.service.lessons()]
      .filter((l) => !q || has(l.title) || l.blocks.some((b) => has(b.text) || has(b.url)))
      .sort((a, b) => a.title.localeCompare(b.title, this.i18n.locale()));
  });

  // Desktop: the picked lesson, else the first one in the list.
  private readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed<Lesson | null>(() => {
    const list = this.visible();
    return list.find((l) => l.id === this.selectedId()) ?? list.at(0) ?? null;
  });

  constructor() {
    // Mobile toolbar: the search field instead of a title.
    const toolbar = inject(ToolbarService);
    effect(() => toolbar.content.set(this.search() ?? null));
    inject(DestroyRef).onDestroy(() => toolbar.content.set(null));
  }

  // Under the title: the start of the first text, else the first link.
  protected summary(l: Lesson): string {
    const text = l.blocks.find((b) => b.kind === 'text')?.text;
    return text ?? l.blocks.find((b) => b.kind === 'link')?.url ?? '';
  }

  protected pick(l: Lesson): void {
    if (this.desktop) this.selectedId.set(l.id);
    else this.stack.push({ kind: 'lesson', id: l.id });
  }
}
