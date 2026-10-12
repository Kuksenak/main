import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@environments/environment';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { taskProgress } from '../lessons/gaps';
import { LessonAnswers, LessonContent, LessonFills } from '../lessons/lesson-content';
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
  fills?: LessonFills;
  submittedAt?: string | null; // sent to the teacher: closed
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
    <!-- Desktop: a lesson open takes the width (its blocks in tiles) -->
    <div class="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)]" [class.desktop:max-w-none]="!!open()" [class.desktop:px-6]="!!open()">
      @switch (state()) {
        @case ('loading') {
          <p class="text-body py-10 text-center opacity-40">{{ 'app.loading' | t }}</p>
        }
        @case ('missing') {
          <p class="text-body py-10 text-center opacity-40">{{ 'portal.notFound' | t }}</p>
        }
        @default {
          @if (open(); as l) {
            <!-- One lesson: ‹ and its title in one compact row -->
            <div class="flex min-h-9 items-center gap-1">
              <button type="button" (click)="open.set(null)" [attr.aria-label]="'action.back' | t" class="icon-btn shrink-0">
                <app-icon name="chevron-left" class="-ml-0.5 size-7 desktop:size-5" />
              </button>
              <h1 class="min-w-0 flex-1 truncate text-lg font-semibold leading-tight">{{ l.title }}</h1>
              <!-- What's answered and kept, Send (the teacher gets it then; sent: closed) -->
              @if (l.submittedAt) {
                <span class="text-footnote flex shrink-0 items-center gap-1 font-medium text-[var(--success)]">
                  <app-icon name="check" [strokeWidth]="2.5" class="size-4" />{{ 'shared.sent' | t }}
                </span>
                <!-- Back to a draft, to change it -->
                <button type="button" (click)="reopen(l)" [disabled]="sending()" class="chip ml-1 shrink-0 gap-1.5 !rounded-full"><app-icon name="compose" class="size-4 opacity-60" />{{ 'shared.reopen' | t }}</button>
              } @else {
                @if (exercises(l)) {
                  <span class="text-footnote mr-1 shrink-0 whitespace-nowrap opacity-60 mobile:hidden">{{ answered(l) }}/{{ exercises(l) }} {{ 'shared.answered' | t }}@if (saved()) {, {{ 'shared.saved' | t }}}</span>
                }
                <button type="button" (click)="submit(l)" [disabled]="sending()" class="btn-primary shrink-0 !rounded-full !px-4 !py-1.5">{{ 'shared.send' | t }}</button>
              }
            </div>
            <app-lesson-content
              [blocks]="l.blocks"
              [indexes]="l.indexes"
              mode="student"
              [answers]="l.answers"
              (answersChange)="change(l, { answers: $event })"
              [ticks]="l.ticks"
              (ticksChange)="change(l, { ticks: $event })"
              [fills]="l.fills ?? {}"
              (fillsChange)="change(l, { fills: $event })"
              [locked]="!!l.submittedAt"
              [tiled]="true"
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
  protected readonly sending = signal(false);

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
    // Leaving / hiding the page: what's not saved yet goes now (requests that outlive the page)
    const hide = () => {
      if (document.visibilityState === 'hidden') this.flushAll();
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', hide);
    inject(DestroyRef).onDestroy(() => {
      this.flushAll();
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', hide);
    });
  }

  // Its tasks (exercises and gaps blocks), and how many are done
  protected exercises(l: PortalLesson): number {
    return taskProgress(l.blocks, l.indexes, l.answers, l.fills ?? {}).total;
  }

  protected answered(l: PortalLesson): number {
    return taskProgress(l.blocks, l.indexes, l.answers, l.fills ?? {}).done;
  }

  // An answer / a tick / a word: kept in the lesson (and the list), saved 1.5 s after the lesson's
  // last change (typing: one request per pause; each lesson on its own), or as the page goes
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pending = new Map<string, PortalLesson>();

  private payload(l: PortalLesson) {
    return { answers: l.answers, ticks: l.ticks, fills: l.fills ?? {} };
  }

  private flushAll(): void {
    for (const l of this.pending.values()) {
      fetch(`${this.base}/lessons/${l.id}/attempt`, {
        method: 'PUT',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.payload(l)),
      }).catch(() => {});
    }
    this.pending.clear();
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }
  protected change(l: PortalLesson, p: Partial<Pick<PortalLesson, 'answers' | 'ticks' | 'fills'>>): void {
    if (l.submittedAt) return;
    const updated = { ...l, ...p };
    this.lessons.update((list) => list.map((x) => (x.id === l.id ? updated : x)));
    this.open.set(updated);
    this.saved.set(false);
    this.pending.set(l.id, updated);
    clearTimeout(this.timers.get(l.id));
    this.timers.set(
      l.id,
      setTimeout(() => {
        this.timers.delete(l.id);
        this.pending.delete(l.id);
        this.http
          .put(`${this.base}/lessons/${updated.id}/attempt`, this.payload(updated))
          .subscribe({ next: () => this.saved.set(true), error: () => {} });
      }, 1500),
    );
  }

  // The lesson as it is now, sent to the teacher (its pending save goes with it); closed then
  protected submit(l: PortalLesson): void {
    if (this.sending()) return;
    clearTimeout(this.timers.get(l.id));
    this.timers.delete(l.id);
    this.pending.delete(l.id);
    this.sending.set(true);
    this.http
      .post<{ submittedAt: string }>(`${this.base}/lessons/${l.id}/attempt/submit`, {
        answers: l.answers,
        ticks: l.ticks,
        fills: l.fills ?? {},
      })
      .subscribe({
        next: (r) => {
          const sent = { ...l, submittedAt: r.submittedAt ?? new Date().toISOString() };
          this.lessons.update((list) => list.map((x) => (x.id === l.id ? sent : x)));
          this.open.set(sent);
          this.sending.set(false);
        },
        error: () => this.sending.set(false),
      });
  }

  // Completed → a draft again
  protected reopen(l: PortalLesson): void {
    if (this.sending()) return;
    this.sending.set(true);
    this.http.post(`${this.base}/lessons/${l.id}/attempt/reopen`, {}).subscribe({
      next: () => {
        const draft = { ...l, submittedAt: null };
        this.lessons.update((list) => list.map((x) => (x.id === l.id ? draft : x)));
        this.open.set(draft);
        this.sending.set(false);
      },
      error: () => this.sending.set(false),
    });
  }

  protected day(iso: string): string {
    return this.i18n.date(new Date(iso), { weekday: 'short', day: 'numeric', month: 'short' });
  }

  protected time(iso: string): string {
    return this.i18n.time(new Date(iso));
  }
}
