import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@environments/environment';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { taskProgress } from './gaps';
import { LessonAnswers, LessonContent, LessonFills } from './lesson-content';
import { LessonBlock } from './lesson.service';

const NAME_KEY = 'guestName';
const VISITOR_KEY = 'lessonVisitor';

function stored(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode: kept for this visit only
  }
}

// This device, so coming back continues the same attempt (made once, kept)
function visitorKey(): string {
  let key = stored(VISITOR_KEY);
  if (!key) {
    key = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    store(VISITOR_KEY, key);
  }
  return key;
}

// A short code of the name (lowercase, trimmed; FNV-1a): with the device, which attempt it is —
// someone else's name on the same device starts their own, nothing is overwritten
function nameCode(name: string): string {
  let h = 0x811c9dc5;
  for (const c of name.trim().toLocaleLowerCase()) {
    h ^= c.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

interface Attempt {
  name: string;
  answers: LessonAnswers;
  ticks: string[];
  fills?: LessonFills;
  submittedAt?: string | null;
}

/**
 * A shared lesson at its public link (/l/:token): readable by anyone, no sign-in. Visitors give
 * just their name first (remembered on this device; their name at the top changes it). Their
 * answers and ticks are saved as they go — one attempt per device and name (coming back
 * continues it; another name on the same device has its own); the teacher sees them with the
 * lesson. A pill at the bottom counts what's answered.
 */
@Component({
  selector: 'app-shared-lesson',
  imports: [FormsModule, Icon, LessonContent, TranslatePipe],
  host: { class: 'block h-full overflow-y-auto bg-[var(--app-bg)] text-[var(--text)]' },
  template: `
    <div class="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-[calc(env(safe-area-inset-top)+1rem)]">
      <!-- Just the visitor's name (a tap changes it) -->
      @if (name()) {
        <div class="flex justify-end">
          <button type="button" (click)="name.set('')" class="chip gap-1.5 !rounded-full">
            <app-icon name="person" class="size-4 opacity-60" />{{ name() }}
          </button>
        </div>
      }

      @switch (state()) {
        @case ('loading') {
          <p class="text-body py-10 text-center opacity-40">{{ 'app.loading' | t }}</p>
        }
        @case ('missing') {
          <p class="text-body py-10 text-center opacity-40">{{ 'lessons.notFound' | t }}</p>
        }
        @default {
          <h1 class="px-1 text-[1.75rem] font-bold leading-tight">{{ title() }}</h1>

          @if (!name()) {
            <!-- Just a name, before the lesson -->
            <form (submit)="saveName(); $event.preventDefault()" class="flex flex-col gap-3">
              <p class="text-body px-1">{{ 'shared.askName' | t }}</p>
              <div class="card">
                <div class="list-row">
                  <input name="name" [(ngModel)]="draft" type="text" [placeholder]="'shared.name' | t" autocomplete="name" class="row-input" />
                </div>
              </div>
              <button type="submit" [disabled]="!draft.trim()" class="btn-primary self-start">{{ 'shared.continue' | t }}</button>
            </form>
          } @else {
            <app-lesson-content
              [blocks]="blocks()"
              [indexes]="indexes()"
              mode="student"
              [answers]="answers()"
              (answersChange)="answers.set($event); save()"
              [ticks]="ticks()"
              (ticksChange)="ticks.set($event); save()"
              [fills]="fills()"
              (fillsChange)="fills.set($event); save()"
              [locked]="!!sentAt()"
            />
          }
        }
      }
    </div>

    <!-- What's answered and kept; Send — the teacher gets it then (sent: closed) -->
    @if (name() && state() === 'ready') {
      <div class="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] flex justify-center px-4">
        @if (sentAt()) {
          <span class="glass-neutral text-footnote flex items-center gap-1.5 rounded-full px-3.5 py-2 font-medium">
            <app-icon name="check" [strokeWidth]="2.5" class="size-4 text-[var(--success)]" />{{ 'shared.sent' | t }}
          </span>
        } @else {
          <div class="glass-neutral pointer-events-auto flex items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5">
            @if (exercises() > 0) {
              <span class="text-footnote whitespace-nowrap opacity-70">{{ progress() }}</span>
            }
            <button type="button" (click)="submit()" [disabled]="sending()" class="btn-primary !rounded-full !px-4 !py-1.5">{{ 'shared.send' | t }}</button>
          </div>
        }
      </div>
    }
  `,
})
export class SharedLesson {
  private http = inject(HttpClient);
  private i18n = inject(I18nService);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  private readonly base = `${environment.apiUrl}/shared/lessons/${encodeURIComponent(this.token)}`;
  private readonly device = visitorKey();
  // This attempt: the device and the name
  private visitor(): string {
    return `${this.device}:${nameCode(this.name())}`;
  }

  protected readonly state = signal<'loading' | 'ready' | 'missing'>('loading');
  protected readonly title = signal('');
  protected readonly blocks = signal<LessonBlock[]>([]);
  protected readonly indexes = signal<number[] | null>(null);

  // The visitor's name (tap it at the top to change it), answers and ticks
  protected readonly name = signal(stored(NAME_KEY));
  protected draft = this.name();
  protected readonly answers = signal<LessonAnswers>({});
  protected readonly ticks = signal<string[]>([]);
  protected readonly fills = signal<LessonFills>({});
  private readonly saved = signal(false);
  // Sent to the teacher (when): closed then
  protected readonly sentAt = signal<string | null>(null);
  protected readonly sending = signal(false);

  // The tasks (exercises and gaps blocks): how many, how many done
  private readonly tasks = computed(() => taskProgress(this.blocks(), this.indexes(), this.answers(), this.fills()));
  protected readonly exercises = computed(() => this.tasks().total);
  // "2/3 answered, saved"
  protected readonly progress = computed(() => {
    const { done, total } = this.tasks();
    const text = `${done}/${total} ${this.i18n.t('shared.answered')}`;
    return this.saved() ? `${text}, ${this.i18n.t('shared.saved')}` : text;
  });

  constructor() {
    this.http.get<{ title: string; blocks: LessonBlock[]; indexes?: number[] }>(this.base).subscribe({
      next: (l) => {
        this.title.set(l.title);
        this.blocks.set(l.blocks);
        this.indexes.set(l.indexes ?? null);
        this.state.set('ready');
      },
      error: () => this.state.set('missing'),
    });
    if (this.name()) this.loadAttempt();
    // Leaving / hiding the page: what's not saved yet goes now (a request that outlives the page)
    const hide = () => {
      if (document.visibilityState === 'hidden') this.flush(true);
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', hide);
    inject(DestroyRef).onDestroy(() => {
      this.flush(true);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', hide);
    });
  }

  // This device's earlier attempt under this name: continue it (none: start one)
  private loadAttempt(): void {
    this.answers.set({});
    this.ticks.set([]);
    this.fills.set({});
    this.sentAt.set(null);
    this.saved.set(false);
    this.http.get<Attempt | null>(`${this.base}/attempt`, { params: { visitor: this.visitor() } }).subscribe({
      next: (a) => {
        // None yet: made now, so the teacher sees who opened the lesson even before any answer
        if (!a) return this.save();
        this.answers.set(a.answers ?? {});
        this.ticks.set(a.ticks ?? []);
        this.fills.set(a.fills ?? {});
        this.sentAt.set(a.submittedAt ?? null);
        this.saved.set(true);
      },
      error: () => {},
    });
  }

  protected saveName(): void {
    const name = this.draft.trim();
    if (!name) return;
    this.name.set(name);
    store(NAME_KEY, name);
    this.loadAttempt();
  }

  // Everything as it is now, sent to the teacher (the draft's pending save goes with it)
  protected submit(): void {
    if (!this.name() || this.sending()) return;
    clearTimeout(this.timer);
    this.pending = false;
    this.sending.set(true);
    this.http.post<{ submittedAt: string }>(`${this.base}/attempt/submit`, this.body()).subscribe({
      next: (r) => {
        this.sentAt.set(r.submittedAt ?? new Date().toISOString());
        this.sending.set(false);
      },
      error: () => this.sending.set(false),
    });
  }

  private body() {
    return { visitor: this.visitor(), name: this.name(), answers: this.answers(), ticks: this.ticks(), fills: this.fills() };
  }

  // Saved 1.5 s after the last change (typing, taps in a row: one request), or as the page goes
  private timer?: ReturnType<typeof setTimeout>;
  private pending = false;
  protected save(): void {
    if (this.sentAt()) return;
    this.saved.set(false);
    this.pending = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 1500);
  }

  private flush(leaving = false): void {
    clearTimeout(this.timer);
    if (!this.pending || !this.name() || this.sentAt()) return;
    this.pending = false;
    if (leaving) {
      fetch(`${this.base}/attempt`, {
        method: 'PUT',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.body()),
      }).catch(() => {});
      return;
    }
    this.http.put(`${this.base}/attempt`, this.body()).subscribe({ next: () => this.saved.set(true), error: () => {} });
  }
}
