import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, TemplateRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { SearchField } from '../core/ui/search-field';
import { Lesson, LessonService } from './lesson.service';

/**
 * The lesson library: search (mobile: in the toolbar) and the list; a tap opens the lesson's
 * own page, + opens a new one there.
 */
@Component({
  selector: 'app-lessons',
  imports: [NgTemplateOutlet, Icon, RouterLink, ScrollArea, SearchField, TranslatePipe],
  template: `
    <ng-template #search>
      <app-search-field [(value)]="query" />
    </ng-template>

    <!-- Bottom padding keeps the list clear of the floating button -->
    <main class="flex min-h-0 w-full flex-1 flex-col gap-3 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
      <section class="flex min-h-0 w-full flex-1 flex-col gap-3 pb-14">
        <div class="mobile:hidden desktop:max-w-md"><ng-container [ngTemplateOutlet]="search" /></div>

        @if (visible().length) {
          <app-scroll-area class="min-h-0 shrink" viewportClass="card">
            @for (l of visible(); track l.id) {
              <a [routerLink]="['/lessons', l.id]" class="list-row w-full py-2">
                <div class="min-w-0 flex-1 leading-tight">
                  <p class="truncate font-medium">{{ l.title }}</p>
                  @if (summary(l); as s) {
                    <p class="text-footnote truncate opacity-50">{{ s }}</p>
                  }
                </div>
                <app-icon name="chevron-right" class="row-chevron" />
              </a>
            }
          </app-scroll-area>
        } @else {
          <div class="flex flex-1 items-center justify-center">
            <p class="text-body opacity-40">{{ (query() ? 'students.notFound' : 'lessons.empty') | t }}</p>
          </div>
        }
      </section>
    </main>

    <a routerLink="/lessons/new" [attr.aria-label]="'lessons.add' | t" class="btn-confirm float-bottom right-4">
      <app-icon name="plus" [strokeWidth]="2" class="size-7 desktop:size-6" />
    </a>
  `,
})
export class Lessons {
  private service = inject(LessonService);
  private i18n = inject(I18nService);
  private readonly search = viewChild<TemplateRef<unknown>>('search');

  protected readonly query = signal('');

  // Alphabetical, filtered by title and text.
  protected readonly visible = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    const has = (v: string | null) => !!v && v.toLocaleLowerCase().includes(q);
    return [...this.service.lessons()]
      .filter((l) => !q || has(l.title) || l.blocks.some((b) => has(b.text) || has(b.url)))
      .sort((a, b) => a.title.localeCompare(b.title, this.i18n.locale()));
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
}
