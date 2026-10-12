import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@environments/environment';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { LessonAnswers, LessonContent } from '../lessons/lesson-content';
import { LessonBlock } from '../lessons/lesson.service';

interface PortalClass {
  title: string | null;
  startsAt: string;
  durationMinutes: number;
  lessonIds: string[];
}

interface PortalLesson {
  id: string;
  title: string;
  blocks: LessonBlock[];
  indexes: number[];
  nextAt: string | null;
  lastAt: string | null;
  answers: LessonAnswers;
  ticks: string[];
}

/**
 * A student's own page by their personal link (/s/:token), no sign-in: their name, their next
 * classes, the lessons of their classes (next / last time); a lesson opens right here — its
 * exercises answered and checklists ticked are saved as theirs (the teacher sees them under
 * their name), a pill at the bottom counts what's answered.
 */
@Component({
  selector: 'app-student-portal',
  imports: [Icon, LessonContent, TranslatePipe],
  host: { class: 'block h-full overflow-y-auto bg-[var(--app-bg)] text-[var(--text)]' },
  template: `
    <div class="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-[calc(env(safe-area-inset-top)+1rem)]">
      @switch (state()) {
        @case ('loading') {
          <p class="text-body py-10 text-center opacity-40">{{ 'app.loading' | t }}</p>
        }
        @case ('missing') {
          <p class="text-body py-10 text-center opacity-40">{{ 'portal.notFound' | t }}</p>
        }
        @default {
          @if (open(); as l) {
            <!-- One lesson -->
            <div class="flex items-center">
              <button type="button" (click)="open.set(null)" [attr.aria-label]="'action.back' | t" class="icon-btn">
                <app-icon name="chevron-left" class="-ml-0.5 size-7 desktop:size-5" />
              </button>
            </div>
            <h1 class="px-1 text-[1.75rem] font-bold leading-tight">{{ l.title }}</h1>
            <app-lesson-content
              [blocks]="l.blocks"
              [indexes]="l.indexes"
              mode="student"
              [answers]="l.answers"
              (answersChange)="change(l, { answers: $event })"
              [ticks]="l.ticks"
              (ticksChange)="change(l, { ticks: $event })"
            />
          } @else {
            <h1 class="px-1 text-[1.75rem] font-bold leading-tight">{{ name() }}</h1>

            @if (upcoming().length) {
              <div class="flex flex-col gap-1.5">
                <span class="card-label">{{ 'portal.next' | t }}</span>
                <div class="card">
                  @for (c of upcoming(); track $index) {
                    <div class="list-row">
                      <app-icon name="calendar" class="row-icon" />
                      <span class="flex-1">{{ day(c.startsAt) }}</span>
                      <span class="tabular-nums opacity-50">{{ time(c.startsAt) }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <div class="flex flex-col gap-1.5">
              <span class="card-label">{{ 'nav.lessons' | t }}</span>
              @if (lessons().length) {
                <div class="card">
                  @for (l of lessons(); track l.id) {
                    <button type="button" (click)="open.set(l)" class="list-row w-full py-2 text-left">
                      <div class="min-w-0 flex-1 leading-tight">
                        <p class="truncate font-medium">{{ l.title }}</p>
                        <p class="text-footnote flex gap-2 opacity-50">
                          <span>{{ (l.nextAt ? 'lessons.next' : 'lessons.last') | t }}</span>
                          <span>{{ day(l.nextAt ?? l.lastAt!) }}</span>
                          @if (exercises(l); as n) {
                            <span>{{ answered(l) }}/{{ n }} {{ 'shared.answered' | t }}</span>
                          }
                        </p>
                      </div>
                      <app-icon name="chevron-right" class="row-chevron" />
                    </button>
                  }
                </div>
              } @else {
                <p class="text-footnote px-1 opacity-50">{{ 'portal.noLessons' | t }}</p>
              }
            </div>
          }
        }
      }
    </div>

    <!-- In a lesson: what's answered, and that it's kept -->
    @if (open(); as l) {
      @if (exercises(l)) {
        <div class="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] flex justify-center">
          <span class="glass-neutral text-footnote rounded-full px-3.5 py-2">
            {{ answered(l) }}/{{ exercises(l) }} {{ 'shared.answered' | t }}@if (saved()) {, {{ 'shared.saved' | t }}}
          </span>
        </div>
      }
    }
  `,
})
export class StudentPortal {
  private http = inject(HttpClient);
  private i18n = inject(I18nService);
  private readonly base = `${environment.apiUrl}/portal/${encodeURIComponent(inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '')}`;

  protected readonly state = signal<'loading' | 'ready' | 'missing'>('loading');
  protected readonly name = signal('');
  protected readonly upcoming = signal<PortalClass[]>([]);
  protected readonly lessons = signal<PortalLesson[]>([]);
  protected readonly open = signal<PortalLesson | null>(null);
  protected readonly saved = signal(true);

  constructor() {
    this.http.get<{ name: string; upcoming: PortalClass[]; lessons: PortalLesson[] }>(this.base).subscribe({
      next: (p) => {
        this.name.set(p.name);
        this.upcoming.set(p.upcoming ?? []);
        this.lessons.set(p.lessons ?? []);
        this.state.set('ready');
      },
      error: () => this.state.set('missing'),
    });
    inject(DestroyRef).onDestroy(() => this.timers.forEach((t) => clearTimeout(t)));
  }

  protected exercises(l: PortalLesson): number {
    return l.blocks.filter((b) => b.kind === 'exercise').length;
  }

  protected answered(l: PortalLesson): number {
    return Object.keys(l.answers).length;
  }

  // An answer / a tick: kept in the lesson (and the list), saved a moment after the lesson's last
  // change (each lesson on its own)
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  protected change(l: PortalLesson, p: Partial<Pick<PortalLesson, 'answers' | 'ticks'>>): void {
    const updated = { ...l, ...p };
    this.lessons.update((list) => list.map((x) => (x.id === l.id ? updated : x)));
    this.open.set(updated);
    this.saved.set(false);
    clearTimeout(this.timers.get(l.id));
    this.timers.set(
      l.id,
      setTimeout(() => {
        this.timers.delete(l.id);
        this.http
          .put(`${this.base}/lessons/${updated.id}/attempt`, { answers: updated.answers, ticks: updated.ticks })
          .subscribe({ next: () => this.saved.set(true), error: () => {} });
      }, 400),
    );
  }

  protected day(iso: string): string {
    return this.i18n.date(new Date(iso), { weekday: 'short', day: 'numeric', month: 'short' });
  }

  protected time(iso: string): string {
    return this.i18n.time(new Date(iso));
  }
}
