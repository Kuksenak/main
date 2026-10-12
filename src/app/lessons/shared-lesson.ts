import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@environments/environment';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { LessonAnswers, LessonContent } from './lesson-content';
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
            />
          }
        }
      }
    </div>

    <!-- What's answered, and that it's kept -->
    @if (name() && exercises() > 0) {
      <div class="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+1rem)] flex justify-center">
        <span class="glass-neutral text-footnote rounded-full px-3.5 py-2">{{ progress() }}</span>
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
  private readonly saved = signal(false);

  protected readonly exercises = computed(() => this.blocks().filter((b) => b.kind === 'exercise').length);
  // "2/3 answered, saved"
  protected readonly progress = computed(() => {
    const done = Object.keys(this.answers()).length;
    const text = `${done}/${this.exercises()} ${this.i18n.t('shared.answered')}`;
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
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  // This device's earlier attempt under this name: continue it (none: start one)
  private loadAttempt(): void {
    this.answers.set({});
    this.ticks.set([]);
    this.saved.set(false);
    this.http.get<Attempt | null>(`${this.base}/attempt`, { params: { visitor: this.visitor() } }).subscribe({
      next: (a) => {
        // None yet: made now, so the teacher sees who opened the lesson even before any answer
        if (!a) return this.save();
        this.answers.set(a.answers ?? {});
        this.ticks.set(a.ticks ?? []);
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

  // Saved a moment after the last change (taps in a row: one request)
  private timer?: ReturnType<typeof setTimeout>;
  protected save(): void {
    this.saved.set(false);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.name()) return;
      const body = { visitor: this.visitor(), name: this.name(), answers: this.answers(), ticks: this.ticks() };
      this.http.put(`${this.base}/attempt`, body).subscribe({ next: () => this.saved.set(true), error: () => {} });
    }, 400);
  }
}
