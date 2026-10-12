import { HttpClient } from '@angular/common/http';
import { DestroyRef } from '@angular/core';
import { NotificationsService } from '../core/services/notifications.service';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { catchError, of } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { initial } from '../core/utils/text';
import { LessonAnswers, LessonContent } from './lesson-content';
import { Lesson } from './lesson.service';

/** Someone's go at the lesson by its public link. */
interface Attempt {
  id: string;
  name: string;
  studentId: string | null; // one of the teacher's students (their personal link), else a guest
  answers: LessonAnswers;
  ticks: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * The teacher's view of who went through the lesson by its public link: a "Students" card —
 * each one's name, when they were last there, how many exercises they answered and how many
 * right; a tap opens their answers (the lesson as they left it). Nothing shows until someone has.
 */
@Component({
  selector: 'app-lesson-attempts',
  imports: [Icon, LessonContent, PageSheet, TranslatePipe],
  host: { class: 'flex flex-col gap-1.5' },
  template: `
    @if (attempts().length) {
      <span class="card-label">{{ 'nav.students' | t }}</span>
      <div class="card">
        @for (a of attempts(); track a.id) {
          @let s = score(a);
          <button type="button" (click)="open.set(a)" class="list-row w-full py-2 text-left">
            <span class="avatar">{{ initial(a.name) }}</span>
            <div class="min-w-0 flex-1 leading-tight">
              <p class="flex items-center gap-1.5">
                <span class="truncate font-medium">{{ a.name }}</span>
                @if (!a.studentId) {
                  <span class="text-footnote shrink-0 opacity-50">{{ 'lessons.guest' | t }}</span>
                }
              </p>
              <p class="text-footnote flex min-w-0 gap-2 opacity-50">
                <span class="shrink-0">{{ when(a.updatedAt) }}</span>
                <span class="truncate">{{ s.done }}/{{ s.total }} {{ 'shared.answered' | t }}</span>
              </p>
            </div>
            @if (s.total) {
              <span class="text-footnote rounded-full bg-[color-mix(in_srgb,var(--success)_15%,transparent)] px-2 py-0.5 font-semibold text-[var(--success)]">{{ s.right }} {{ 'lessons.rightShort' | t }}</span>
            }
            <app-icon name="chevron-right" class="row-chevron" />
          </button>
        }
      </div>
    }

    <!-- One student's answers -->
    @if (open(); as a) {
      <app-page-sheet [title]="a.name" [actions]="false" (closed)="open.set(null)">
        <div class="flex flex-col gap-5">
          <h1 class="px-1 text-xl font-semibold desktop:block mobile:hidden">{{ a.name }}</h1>
          @let s = score(a);
          <div class="card">
            <div class="list-row"><span class="flex-1">{{ 'lessons.opened' | t }}</span><span class="opacity-50">{{ when(a.createdAt) }}</span></div>
            <div class="list-row"><span class="flex-1">{{ 'lessons.answeredRow' | t }}</span><span class="opacity-50">{{ s.done }}/{{ s.total }}, {{ s.right }} {{ 'lessons.rightShort' | t }}</span></div>
          </div>
          <app-lesson-content [blocks]="studentBlocks()" [indexes]="studentIndexes()" mode="review" [who]="a.name" [answers]="a.answers" [ticks]="a.ticks" />
        </div>
      </app-page-sheet>
    }
  `,
})
export class LessonAttempts {
  readonly lesson = input.required<Lesson>();

  private http = inject(HttpClient);
  private i18n = inject(I18nService);
  protected readonly attempts = signal<Attempt[]>([]);
  protected readonly open = signal<Attempt | null>(null);

  // What the students see (their answers are keyed by each block's place in the whole lesson)
  private readonly studentPart = computed(() =>
    this.lesson()
      .blocks.map((block, i) => ({ block, i }))
      .filter((b) => !b.block.private),
  );
  protected readonly studentBlocks = computed(() => this.studentPart().map((b) => b.block));
  protected readonly studentIndexes = computed(() => this.studentPart().map((b) => b.i));

  constructor() {
    // The lesson's attempts (again when it changes, e.g. after an edit)
    effect(() => this.load(this.lesson().id));
    // Someone just finished it: the list again (the banner says so)
    const sub = inject(NotificationsService).received.subscribe((n) => {
      if (n.kind === 'lessonFinished' && n.url.endsWith(`/${this.lesson().id}`)) this.load(this.lesson().id);
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  private load(id: string): void {
    this.http
      .get<{ attempts: Attempt[] }>(`${environment.apiUrl}/lessons/${id}/attempts`)
      .pipe(catchError(() => of({ attempts: [] as Attempt[] })))
      .subscribe((res) => this.attempts.set(res.attempts ?? []));
  }

  // How far they got: exercises answered, and right (of those with a right answer set)
  protected score(a: Attempt): { done: number; total: number; right: number } {
    const exercises = this.studentPart().filter((b) => b.block.kind === 'exercise');
    let done = 0;
    let right = 0;
    for (const { block, i } of exercises) {
      const picked = a.answers[i];
      if (picked === undefined) continue;
      done++;
      if (block.answer != null && block.answer === picked) right++;
    }
    return { done, total: exercises.length, right };
  }

  // "Today 10:24" / "Thu 9 Oct"
  protected when(iso: string): string {
    const d = new Date(iso);
    const today = new Date().toDateString() === d.toDateString();
    return today
      ? `${this.i18n.t('lessons.today')} ${this.i18n.time(d)}`
      : this.i18n.date(d, { weekday: 'short', day: 'numeric', month: 'short' });
  }

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
  }
}
