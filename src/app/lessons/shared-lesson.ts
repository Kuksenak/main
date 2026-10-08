import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@environments/environment';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { DemoQuiz } from './demo-quiz';
import { LessonContent } from './lesson-content';
import { LessonBlock } from './lesson.service';

const NAME_KEY = 'guestName';

function storedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * A shared lesson at its public link (/l/:token): readable by anyone, no sign-in. Visitors give
 * just their name first (remembered on this device) — their test answers will be saved under it.
 */
@Component({
  selector: 'app-shared-lesson',
  imports: [DemoQuiz, FormsModule, LessonContent, TranslatePipe],
  host: { class: 'block h-full overflow-y-auto bg-[var(--app-bg)] text-[var(--text)]' },
  template: `
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+1rem)]">
      <header class="flex items-center gap-2">
        <img src="logo.png" alt="" class="size-6 opacity-60" width="24" height="24" />
        <span class="text-footnote flex-1 font-medium opacity-60">{{ 'app.name' | t }}</span>
        @if (name()) {
          <button type="button" (click)="name.set('')" class="text-footnote text-[var(--accent)] active:opacity-60">{{ name() }}</button>
        }
      </header>

      @switch (state()) {
        @case ('loading') {
          <p class="text-body py-10 text-center opacity-40">{{ 'app.loading' | t }}</p>
        }
        @case ('missing') {
          <p class="text-body py-10 text-center opacity-40">{{ 'lessons.notFound' | t }}</p>
        }
        @default {
          <h1 class="text-2xl font-semibold">{{ title() }}</h1>

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
            <app-lesson-content [blocks]="blocks()" />
            <app-demo-quiz />
          }
        }
      }
    </div>
  `,
})
export class SharedLesson {
  protected readonly state = signal<'loading' | 'ready' | 'missing'>('loading');
  protected readonly title = signal('');
  protected readonly blocks = signal<LessonBlock[]>([]);

  // The visitor's name (tap it in the header to change it).
  protected readonly name = signal(storedName());
  protected draft = this.name();

  constructor() {
    const token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
    inject(HttpClient)
      .get<{ title: string; blocks: LessonBlock[] }>(`${environment.apiUrl}/shared/lessons/${encodeURIComponent(token)}`)
      .subscribe({
        next: (l) => {
          this.title.set(l.title);
          this.blocks.set(l.blocks);
          this.state.set('ready');
        },
        error: () => this.state.set('missing'),
      });
  }

  protected saveName(): void {
    const name = this.draft.trim();
    if (!name) return;
    this.name.set(name);
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      // private mode: keep it for this visit only
    }
  }
}
