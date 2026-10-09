import { Component, DestroyRef, OnInit, inject, input, output, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { StackEntry } from '../core/services/nav-stack.service';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { Sheet } from '../core/ui/sheet/sheet';
import { DemoQuiz } from '../lessons/demo-quiz';
import { LessonContent } from '../lessons/lesson-content';
import { LessonForm } from '../lessons/lesson-form';
import { LessonInfo } from '../lessons/lesson-info';
import { LessonState } from '../lessons/lesson-state';

/**
 * A lesson on mobile, opened on the NavStack full-screen (desktop shows lessons as a page, see
 * LessonPage): its content, edited in place (Edit → the form; Save, Cancel or back return to
 * reading). ⓘ opens the public link switch and the events using it. A new lesson (id null)
 * starts in the form. Opened from its link (/lessons/:id) it follows the URL: closing goes back
 * to /lessons, and leaving that URL (browser back) closes it.
 */
@Component({
  selector: 'app-lesson-card',
  imports: [DemoQuiz, Icon, LessonContent, LessonForm, LessonInfo, PageSheet, Sheet, TranslatePipe],
  template: `
    <app-page-sheet
      #page
      [wide]="true"
      [title]="s.heading()"
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
      <!-- Top bar (reading): ⓘ and Edit in one glass capsule -->
      @if (!s.editing()) {
        <div barEnd class="btn-group">
          <button #infoBtn type="button" (click)="infoOrigin.set(infoBtn)" [attr.aria-label]="'lessons.info' | t">
            <app-icon name="i" class="size-6" />
          </button>
          <button type="button" (click)="s.edit()" [attr.aria-label]="'action.edit' | t">
            <app-icon name="compose" class="size-[1.375rem]" />
          </button>
        </div>
      }

      <div class="flex flex-col gap-6">
        @if (s.editing()) {
          <app-lesson-form [(value)]="s.draft" />
        } @else if (s.lesson(); as l) {
          <app-lesson-content [blocks]="l.blocks" />
          <app-demo-quiz />
        }
      </div>
    </app-page-sheet>

    @if (infoOrigin(); as origin) {
      @if (s.lesson(); as l) {
        <app-sheet [origin]="origin" (closed)="infoOrigin.set(null)">
          <app-lesson-info [lesson]="l" />
        </app-sheet>
      }
    }
  `,
})
export class LessonCard implements OnInit {
  readonly entry = input.required<StackEntry>();
  readonly closed = output<void>();

  protected readonly s = new LessonState(() => this.entry().id);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private readonly page = viewChild.required<PageSheet>('page');

  // The ⓘ sheet, open under its button.
  protected readonly infoOrigin = signal<HTMLElement | null>(null);

  // The lesson's link, when the card was opened from it.
  private link: string | null = null;

  ngOnInit(): void {
    const own = `/lessons/${this.entry().id}`;
    if (this.router.url !== own) return;
    this.link = own;
    const sub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.router.url !== own) this.page().close();
      });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  protected onClosed(): void {
    if (this.link && this.router.url === this.link) this.router.navigate(['/lessons']);
    this.closed.emit();
  }

  protected remove(): void {
    this.s.remove();
    this.page().close();
  }
}
