import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, TemplateRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { NavStack } from '../core/services/nav-stack.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { SearchField } from '../core/ui/search-field';
import { Lesson, LessonService } from './lesson.service';

/**
 * The lesson library: search (mobile: in the toolbar) and the list; a tap opens the lesson
 * (nearly full-screen card) at its own link, /lessons/:id, so it can be shared; + starts a new one.
 */
@Component({
  selector: 'app-lessons',
  imports: [NgTemplateOutlet, Icon, ScrollArea, SearchField, TranslatePipe],
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
              <button type="button" (click)="router.navigate(['/lessons', l.id])" class="list-row w-full py-2 text-left">
                <div class="min-w-0 flex-1 leading-tight">
                  <p class="truncate font-medium">{{ l.title }}</p>
                  @if (summary(l); as s) {
                    <p class="text-footnote truncate opacity-50">{{ s }}</p>
                  }
                </div>
                <app-icon name="chevron-right" class="row-chevron" />
              </button>
            }
          </app-scroll-area>
        } @else {
          <div class="flex flex-1 items-center justify-center">
            <p class="text-body opacity-40">{{ (query() ? 'students.notFound' : 'lessons.empty') | t }}</p>
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
  protected router = inject(Router);
  private readonly linkedId = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id'))));
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
    // /lessons/:id → that lesson's card on top (unless it's open already).
    effect(() => {
      const id = this.linkedId();
      if (!id) return;
      untracked(() => {
        if (!this.stack.entries().some((e) => e.kind === 'lesson' && e.id === id)) this.stack.push({ kind: 'lesson', id });
      });
    });

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
