import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, TemplateRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { NavStack } from '../core/services/nav-stack.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { SearchBar } from '../core/ui/search-bar';
import { ToolbarService } from '../core/services/toolbar.service';
import { SearchField } from '../core/ui/search-field';
import { LessonPage } from './lesson-page';
import { LessonService } from './lesson.service';
import { LessonUsage } from './lesson-usage';

/**
 * The lesson library: search and the list — each lesson with where it is next (else last) in the
 * schedule, 🔗 when public. A tap opens it at its own link, /lessons/:id, so it can be shared —
 * desktop: on the right of the list (LessonPage; the first one when none is picked); phones: as a
 * full-screen card over it. + starts a new one (desktop: /lessons/new on the right).
 */
@Component({
  selector: 'app-lessons',
  imports: [NgTemplateOutlet, Icon, LessonPage, ScrollArea, SearchBar, SearchField, TranslatePipe],
  template: `
    <ng-template #search>
      <app-search-field [(value)]="query" />
    </ng-template>
    <!-- Phones: the search field in the top bar -->
    <ng-template #searchBar>
      <app-search-bar [(value)]="query" [(active)]="searchActive" />
    </ng-template>

    <!-- Desktop: the list on the left (as wide as the schedule's calendar), the lesson on the right
         (like Students). Phones: the list; a lesson opens as a card over it. -->
    <main class="flex min-h-0 w-full flex-1 flex-col gap-3 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 desktop:flex-row desktop:gap-6 desktop:pb-4">
      <section class="flex min-h-0 w-full flex-1 flex-col gap-3 mobile:pb-14 desktop:max-w-[25rem]">
        <!-- Desktop: the search and Add in one row -->
        <div class="flex items-center gap-3 mobile:hidden">
          <div class="min-w-0 flex-1"><ng-container [ngTemplateOutlet]="search" /></div>
          <button type="button" (click)="add()" class="btn-secondary shrink-0 gap-1.5 pl-2.5">
            <app-icon name="plus" [strokeWidth]="2" class="size-[1.125rem]" />
            {{ 'action.add' | t }}
          </button>
        </div>

        @if (visible().length) {
          <app-scroll-area class="min-h-0 shrink" viewportClass="card">
            @for (l of visible(); track l.id) {
              @let use = usage.of(l.id);
              <button type="button" (click)="router.navigate(['/lessons', l.id])" class="list-row w-full py-2 text-left" [class.bg-[var(--highlight)]]="desktop && selected() === l.id">
                <div class="min-w-0 flex-1 leading-tight">
                  <p class="flex items-center gap-1.5 font-medium">
                    <span class="truncate">{{ l.title }}</span>
                    @if (l.shareToken) {
                      <app-icon name="link" class="size-4 shrink-0 opacity-40" />
                    }
                  </p>
                  <!-- Where it is next (else last) in the schedule -->
                  <p class="text-footnote flex min-w-0 gap-2 opacity-50">
                    @if (use.next ?? use.last; as e) {
                      <span class="shrink-0">{{ (use.next ? 'lessons.next' : 'lessons.last') | t }}</span>
                      <span class="shrink-0">{{ usage.day(e) }}</span>
                      <span class="truncate">{{ usage.who(e) }}</span>
                    } @else {
                      <span>{{ 'lessons.unscheduled' | t }}</span>
                    }
                  </p>
                </div>
                <app-icon name="chevron-right" class="row-chevron" />
              </button>
            }
          </app-scroll-area>
        } @else if (query()) {
          <!-- Nothing found: a line where the list was (not centered: that made the page jump
               under the keyboard) -->
          <p class="text-body py-8 text-center opacity-40">{{ 'students.notFound' | t }}</p>
        } @else {
          <div class="flex flex-1 items-center justify-center">
            <p class="text-body opacity-40">{{ 'lessons.empty' | t }}</p>
          </div>
        }
      </section>

      @if (desktop) {
        <section class="flex min-h-0 flex-1 flex-col">
          <!-- One page per lesson (switching lessons starts it afresh: not in the previous one's editing) -->
          @for (id of selectedKey(); track id) {
            <app-lesson-page [lessonId]="id === 'new' ? null : id" />
          }
        </section>
      }
    </main>

    @if (!desktop) {
      <button type="button" (click)="add()" [attr.aria-label]="'lessons.add' | t" class="fab float-bottom right-4" [class.invisible]="searchActive()">
        <app-icon name="plus" [strokeWidth]="2" class="size-7" />
      </button>
    }
  `,
})
export class Lessons {
  private service = inject(LessonService);
  protected usage = inject(LessonUsage);
  private i18n = inject(I18nService);
  protected stack = inject(NavStack);
  protected router = inject(Router);
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly linkedId = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id'))));
  private readonly search = viewChild<TemplateRef<unknown>>('search');
  private readonly searchBar = viewChild<TemplateRef<unknown>>('searchBar');
  // Searching (phones): + hides (it'd show through the search bar's ✕)
  protected readonly searchActive = signal(false);

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
    // Phones: the search field in the top bar (searching: the menu and account step aside)
    const toolbar = inject(ToolbarService);
    if (!this.desktop) effect(() => toolbar.content.set(this.searchBar() ?? null));
    effect(() => toolbar.searching.set(this.searchActive()));
    inject(DestroyRef).onDestroy(() => {
      toolbar.content.set(null);
      toolbar.searching.set(false);
    });

    // Mobile: /lessons/:id → that lesson's card on top (unless it's open already).
    effect(() => {
      const id = this.linkedId();
      if (!id || id === 'new' || this.desktop) return;
      untracked(() => {
        if (!this.stack.entries().some((e) => e.kind === 'lesson' && e.id === id)) this.stack.push({ kind: 'lesson', id });
      });
    });

  }

  protected add(): void {
    if (this.desktop) this.router.navigate(['/lessons', 'new']);
    else this.stack.push({ kind: 'lesson', id: null });
  }

  // Desktop: the lesson on the right — the linked one ('new': a new one), else the first in the list
  protected readonly selected = computed(() => this.linkedId() ?? this.visible().at(0)?.id ?? null);
  protected readonly selectedKey = computed(() => {
    const id = this.selected();
    return id ? [id] : [];
  });
}
