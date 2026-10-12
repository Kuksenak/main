import { Component, DestroyRef, OnInit, inject, input, output, viewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { StackEntry } from '../core/services/nav-stack.service';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { LessonAttempts } from '../lessons/lesson-attempts';
import { LessonContent } from '../lessons/lesson-content';
import { LessonForm } from '../lessons/lesson-form';
import { LessonInfo } from '../lessons/lesson-info';
import { LessonState } from '../lessons/lesson-state';

/**
 * A lesson on mobile, opened on the NavStack full-screen (desktop shows lessons as a page, see
 * LessonPage): its content, edited in place (Edit → the form; Save, Cancel or back return to
 * reading; the public link switch and the events using it are under the form). A new lesson
 * (id null) starts in the form. Opened from its link (/lessons/:id) it follows the URL: closing goes back
 * to /lessons, and leaving that URL (browser back) closes it.
 */
@Component({
  selector: 'app-lesson-card',
  imports: [LessonAttempts, LessonContent, LessonForm, LessonInfo, PageSheet, TranslatePipe],
  template: `
    <app-page-sheet
      #page
      [title]="s.editing() ? '' : (s.lesson()?.title ?? '')"
      [bigTitle]="true"
      [wide]="true"
      [actions]="s.editing()"
      [dirty]="s.editing() && s.dirty()"
      [canSave]="s.canSave()"
      [deletable]="s.editing() && !!s.id()"
      [cancelCloses]="!s.editing() || !s.id()"
      (cancel)="s.cancelEdit()"
      (save)="s.save()"
      (delete)="remove()"
      (closed)="onClosed()"
    >
      <!-- Top bar (reading): Edit -->
      @if (!s.editing() && !entry().readOnly) {
        <button barEnd type="button" (click)="s.edit()" class="btn-white">{{ 'action.edit' | t }}</button>
      }

      <div class="flex flex-col gap-4">
        @if (s.editing()) {
          <app-lesson-form [(value)]="s.draft" />
        } @else if (s.lesson(); as l) {
          <!-- Where it is next (else last) and its public link, then the content (the title is in
               the top bar) -->
          <app-lesson-info [lesson]="l" [compact]="true" />
          <app-lesson-attempts [lesson]="l" />
          <app-lesson-content [blocks]="l.blocks" />
        }
      </div>
    </app-page-sheet>
  `,
})
export class LessonCard implements OnInit {
  readonly entry = input.required<StackEntry>();
  readonly closed = output<void>();

  protected readonly s = new LessonState(() => this.entry().id);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private readonly page = viewChild.required<PageSheet>('page');

  // The lesson's link, when the card was opened from it; and whether the app was already open
  // before (e.g. a notification tapped in it) — then closing goes back there.
  private link: string | null = null;
  private cameFromApp = false;

  ngOnInit(): void {
    const own = `/lessons/${this.entry().id}`;
    if (this.router.url !== own) return;
    this.link = own;
    // Angular numbers its navigations in history.state: 1 is the app's first page
    this.cameFromApp = (history.state?.navigationId ?? 1) > 1;
    const sub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.router.url !== own) this.page().close();
      });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  // Opened from its link: back where it came from in the app (the notifications, …), else the
  // lesson library.
  protected onClosed(): void {
    if (this.link && this.router.url === this.link) {
      if (this.cameFromApp) history.back();
      else this.router.navigate(['/lessons']);
    }
    this.closed.emit();
  }

  protected remove(): void {
    this.s.remove();
    this.page().close();
  }
}
