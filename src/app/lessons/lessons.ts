import { Component, DestroyRef, ElementRef, TemplateRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { NavStack } from '../core/services/nav-stack.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { Tip } from '../core/ui/tip';
import { EscStack } from '../core/ui/esc-stack';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { SearchBar } from '../core/ui/search-bar';
import { ToolbarService } from '../core/services/toolbar.service';
import { SearchField } from '../core/ui/search-field';
import { LessonPage } from './lesson-page';
import { LessonService, levelColor } from './lesson.service';
import { LessonUsage } from './lesson-usage';

/**
 * The lesson library: search and the list — each lesson with where it is next (else last) in the
 * schedule, 🔗 when public. A tap opens it at its own link, /lessons/:id, so it can be shared —
 * desktop: on the right of the list (LessonPage; the first one when none is picked); phones: as a
 * full-screen card over it. + starts a new one (desktop: /lessons/new on the right).
 */
@Component({
  selector: 'app-lessons',
  imports: [Icon, LessonPage, Tip, ScrollArea, SearchBar, SearchField, TranslatePipe],
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
    <main class="flex min-h-0 w-full flex-1 flex-col gap-3 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 desktop:flex-row desktop:gap-4 desktop:-mt-2 desktop:pb-4 desktop:pl-2 desktop:pr-2 desktop:pt-0">
      @if (desktop) {
        <!-- Desktop (as Notion's sidebar): a small search and +, then a row a lesson — its level's
             dot and its name; the open one gray; where it's used in a hint -->
        <section class="flex min-h-0 w-64 shrink-0 flex-col gap-1 border-r border-[var(--separator)] pr-2">
          <div class="flex h-[var(--control-h)] shrink-0 items-center gap-1">
            <!-- Search (as Notion's): a row; it (or Ctrl+K) opens the search window -->
            <button type="button" (click)="openSearch()" class="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--separator)] px-2 text-left text-[0.875rem] hover:bg-[var(--highlight)]">
              <app-icon name="search" class="size-4 shrink-0 opacity-60" />
              <span class="flex-1 opacity-70">{{ 'students.search' | t }}</span>
              <span class="text-footnote opacity-40">Ctrl K</span>
            </button>
            <button type="button" (click)="add()" [appTip]="'lessons.add' | t" tipSide="bottom" [attr.aria-label]="'lessons.add' | t" class="head-btn !px-1.5">
              <app-icon name="plus" />
            </button>
          </div>
          @if (visible().length) {
            <app-scroll-area class="min-h-0 shrink" viewportClass="!rounded-none">
              <div class="flex flex-col gap-px">
                @for (l of visible(); track l.id) {
                  <button
                    type="button"
                    (click)="router.navigate(['/lessons', l.id])"
                    [appTip]="useHint(l.id)"
                    tipSide="right"
                    class="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[0.875rem] hover:bg-[var(--highlight)]"
                    [class.!bg-[var(--highlight)]]="selected() === l.id"
                    [class.font-medium]="selected() === l.id"
                  >
                    <span class="size-2 shrink-0 rounded-full" [style.background]="levelColor(l.level) ?? 'color-mix(in srgb, var(--text) 22%, transparent)'"></span>
                    <span class="min-w-0 flex-1 truncate">{{ l.title }}</span>
                  </button>
                }
              </div>
            </app-scroll-area>
          } @else if (query()) {
            <p class="text-footnote px-2 py-3 opacity-45">{{ 'students.notFound' | t }}</p>
          } @else {
            <p class="text-footnote px-2 py-3 opacity-45">{{ 'lessons.empty' | t }}</p>
          }
        </section>
      } @else {
      <section class="flex min-h-0 w-full flex-1 flex-col gap-3 mobile:pb-14">
        @if (visible().length) {
          <app-scroll-area class="min-h-0 shrink" viewportClass="card">
            @for (l of visible(); track l.id) {
              @let use = usage.of(l.id);
              <button type="button" (click)="router.navigate(['/lessons', l.id])" class="list-row relative w-full py-2 text-left" [class.bg-[var(--highlight)]]="desktop && selected() === l.id">
                <!-- Its level's color: a stripe at the left -->
                @if (levelColor(l.level); as c) {
                  <span aria-hidden="true" class="absolute inset-y-2 left-1.5 w-1 rounded-full" [style.background]="c"></span>
                }
                <div class="min-w-0 flex-1 leading-tight">
                  <p class="flex items-center gap-1.5 font-medium">
                    <span class="truncate">{{ l.title }}</span>
                    @if (l.level) {
                      <span class="shrink-0 rounded px-1 text-[0.6875rem] font-semibold leading-4" [style.background]="levelColor(l.level)">{{ l.level }}</span>
                    }
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
      }

      @if (desktop) {
        <!-- The search window (as Notion's): in the middle, near the top; what's typed finds lessons
             by name and content; ↑ ↓ pick, Enter opens, Esc closes -->
        @if (searchOpen()) {
          <div class="fixed inset-0 z-[2200] flex items-start justify-center bg-[var(--backdrop)] pt-[12vh] [animation:fadeIn_150ms_ease-out]" (mousedown)="closeSearch()">
            <div class="dialog-panel flex max-h-[70vh] w-[36rem] max-w-[90vw] flex-col overflow-hidden !rounded-xl [animation:dropdownIn_160ms_var(--ease-out-quick)]" (mousedown)="$event.stopPropagation()">
              <label class="flex h-12 shrink-0 items-center gap-2.5 px-4">
                <app-icon name="search" class="size-[1.125rem] shrink-0 opacity-50" />
                <input
                  #searchField
                  [value]="searchQuery()"
                  (input)="searchQuery.set($any($event.target).value); searchIndex.set(0)"
                  (keydown)="searchKey($event)"
                  type="text"
                  [placeholder]="'students.search' | t"
                  autocomplete="off"
                  class="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:opacity-45"
                />
              </label>
              <div class="min-h-0 overflow-y-auto p-1.5">
                @for (l of searchResults(); track l.id; let k = $index) {
                  <button
                    type="button"
                    (click)="pickSearch(l.id)"
                    (mouseenter)="searchIndex.set(k)"
                    class="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[0.875rem]"
                    [class.bg-[var(--highlight)]]="k === searchIndex()"
                  >
                    <span class="size-2 shrink-0 rounded-full" [style.background]="levelColor(l.level) ?? 'color-mix(in srgb, var(--text) 22%, transparent)'"></span>
                    <span class="min-w-0 flex-1 truncate">{{ l.title }}</span>
                    @if (useHint(l.id); as h) {
                      <span class="text-footnote shrink-0 opacity-45">{{ h }}</span>
                    }
                  </button>
                } @empty {
                  <p class="text-footnote px-2.5 py-3 opacity-45">{{ 'students.notFound' | t }}</p>
                }
              </div>
            </div>
          </div>
        }

        <section class="flex min-h-0 flex-1 flex-col">
          <!-- One page per lesson (switching lessons starts it afresh: not in the previous one's editing) -->
          @for (key of selectedKey(); track key) {
            <app-lesson-page [lessonId]="selected() === 'new' ? null : selected()" (created)="adopt($event)" />
          } @empty {
            <!-- None picked: nothing open -->
            <div class="flex flex-1 items-center justify-center">
              <p class="text-[0.875rem] opacity-40">{{ 'lessons.pickOne' | t }}</p>
            </div>
          }
        </section>
      }
    </main>

    <!-- (phones: lessons are only read for now — made and edited on a computer) -->
    @if (false) {
      <button type="button" (click)="add()" [attr.aria-label]="'lessons.add' | t" class="fab float-bottom right-4" [class.invisible]="searchActive()">
        <app-icon name="plus" [strokeWidth]="2" class="size-7" />
      </button>
    }
  `,
})
export class Lessons {
  protected readonly levelColor = levelColor;

  // Where it's used: "Next Mon 14 · Anna" (else last; never: no hint), a row's hint
  protected useHint(id: string): string {
    const use = this.usage.of(id);
    const e = use.next ?? use.last;
    if (!e) return '';
    return `${this.i18n.t(use.next ? 'lessons.next' : 'lessons.last')} ${this.usage.day(e)} · ${this.usage.who(e)}`;
  }
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
      .filter((l) => !q || has(l.title) || has(l.level ?? null) || l.blocks.some((b) => has(b.text) || has(b.url)))
      .sort((a, b) => a.title.localeCompare(b.title, this.i18n.locale()));
  });

  // ---- The search window (desktop)
  protected readonly searchOpen = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly searchIndex = signal(0);
  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('searchField');
  private readonly esc = inject(EscStack);
  private offEsc: (() => void) | null = null;
  protected readonly searchResults = computed(() => {
    const q = this.searchQuery().trim().toLocaleLowerCase();
    const has = (v: string | null) => !!v && v.toLocaleLowerCase().includes(q);
    return [...this.service.lessons()]
      .filter((l) => !q || has(l.title) || has(l.level ?? null) || l.blocks.some((b) => has(b.text) || has(b.url)))
      .sort((a, b) => (q ? Number(!has(a.title)) - Number(!has(b.title)) : 0) || a.title.localeCompare(b.title, this.i18n.locale()))
      .slice(0, 50);
  });

  protected openSearch(): void {
    if (this.searchOpen()) return;
    this.searchQuery.set('');
    this.searchIndex.set(0);
    this.searchOpen.set(true);
    this.offEsc = this.esc.push(() => this.closeSearch());
    setTimeout(() => this.searchField()?.nativeElement.focus());
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.offEsc?.();
    this.offEsc = null;
  }

  protected pickSearch(id: string): void {
    this.closeSearch();
    this.router.navigate(['/lessons', id]);
  }

  protected searchKey(e: KeyboardEvent): void {
    const n = this.searchResults().length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (n) this.searchIndex.set((this.searchIndex() + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
    } else if (e.key === 'Enter') {
      const l = this.searchResults()[this.searchIndex()];
      if (l) this.pickSearch(l.id);
    }
  }

  constructor() {
    // Ctrl+K / ⌘K: the search window (desktop)
    const onKey = (e: KeyboardEvent) => {
      if (this.desktop && (e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault();
        this.openSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('keydown', onKey);
      this.offEsc?.();
    });

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

  // A new lesson: a fresh page each time (the one before it may have been saved and kept its page)
  private readonly newCount = signal(0);
  private readonly adopted = signal<string | null>(null);

  protected add(): void {
    this.newCount.update((n) => n + 1);
    this.adopted.set(null);
    if (this.desktop) this.router.navigate(['/lessons', 'new']);
    else this.stack.push({ kind: 'lesson', id: null });
  }

  // Desktop: the lesson on the right — the linked one ('new': a new one); none picked: none open
  protected readonly selected = computed(() => this.linkedId() ?? null);
  // One page per lesson; a new one keeps its page once saved (its link changes under it)
  protected readonly selectedKey = computed(() => {
    const id = this.selected();
    if (!id) return [];
    return [id === 'new' || id === this.adopted() ? `new-${this.newCount()}` : id];
  });

  protected adopt(id: string): void {
    this.adopted.set(id);
    this.router.navigate(['/lessons', id], { replaceUrl: true });
  }
}
