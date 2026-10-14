import { Component, DestroyRef, computed, effect, inject, untracked, viewChild } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { EscStack } from '../core/ui/esc-stack';
import { Icon } from '../core/ui/icon/icon';
import { Tip } from '../core/ui/tip';
import { LessonPage } from '../lessons/lesson-page';
import { PersonPage } from '../students/person-page';
import { PeekService } from './peek.service';

/**
 * A page in a popup (as Notion's peek, desktop): what + creates opens here, over everything;
 * Open in full page (Ctrl+Enter) takes it to its own page (no way back). Leaving (any link) closes it.
 * (Loaded once first opened: the lesson and person pages are big.)
 */
@Component({
  selector: 'app-peek',
  imports: [Icon, LessonPage, PersonPage, Tip, TranslatePipe],
  template: `
    @for (p of shown(); track p.n) {
      <!-- (under the menus and cards it opens: z 25) -->
      <div class="fixed inset-0 z-[25] flex items-center justify-center bg-[var(--backdrop)] [animation:fadeIn_150ms_ease-out]" (mousedown)="peek.close()">
        <div class="flex h-[86vh] w-[min(56rem,92vw)] flex-col overflow-hidden rounded-xl border border-[var(--separator)] bg-[var(--app-bg)] pt-1 shadow-[0_16px_48px_rgb(0_0_0/0.18)]" (mousedown)="$event.stopPropagation()">
          <div class="flex h-9 shrink-0 items-center px-2">
            <button type="button" (click)="openFull()" [appTip]="'**' + ('peek.openFull' | t) + '**  Ctrl+Enter'" tipSide="bottom" [attr.aria-label]="'peek.openFull' | t" class="head-btn"><app-icon name="expand" />{{ 'peek.openFull' | t }}</button>
          </div>
          @if (p.kind === 'lesson') {
            <app-lesson-page [lessonId]="p.id" (created)="created($event)" />
          } @else {
            <app-person-page [kind]="p.kind" [id]="p.id" (created)="created($event)" />
          }
        </div>
      </div>
    }
  `,
})
export class Peek {
  protected readonly peek = inject(PeekService);
  private readonly router = inject(Router);
  private readonly lessonPage = viewChild(LessonPage);
  private readonly personPage = viewChild(PersonPage);
  // (one popup per opening: a new one starts afresh)
  protected readonly shown = computed(() => {
    const p = this.peek.current();
    return p ? [p] : [];
  });
  // Open in full page asked before a new one got its id: taken there once it has it
  private fullWhenCreated = false;

  constructor() {
    const esc = inject(EscStack);
    let offEsc: (() => void) | null = null;
    const keys = (e: KeyboardEvent) => {
      if (this.peek.current() && e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.isComposing) {
        e.preventDefault();
        e.stopPropagation();
        this.openFull();
      }
    };
    document.addEventListener('keydown', keys, true);
    // Esc closes it (while it's the popup on top)
    effect(() => {
      const open = !!this.peek.current();
      untracked(() => {
        if (open && !offEsc) offEsc = esc.push(() => this.peek.close());
        if (!open && offEsc) {
          offEsc();
          offEsc = null;
          this.fullWhenCreated = false;
        }
      });
    });
    const nav = this.router.events.pipe(filter((e) => e instanceof NavigationStart)).subscribe(() => this.peek.close());
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('keydown', keys, true);
      offEsc?.();
      nav.unsubscribe();
    });
  }

  protected created(id: string): void {
    this.peek.setId(id);
    if (this.fullWhenCreated) this.openFull();
  }

  protected openFull(): void {
    const p = this.peek.current();
    if (!p) return;
    if (p.id) {
      this.fullWhenCreated = false;
      this.router.navigate(p.kind === 'lesson' ? ['/lessons', p.id] : ['/students', p.kind, p.id]);
      return;
    }
    // A new one: saved now, then there (a new lesson with nothing in it: a new one there)
    const creating = (p.kind === 'lesson' ? this.lessonPage() : this.personPage())?.flush() ?? false;
    if (creating) this.fullWhenCreated = true;
    else if (p.kind === 'lesson') this.router.navigate(['/lessons', 'new']);
  }
}
