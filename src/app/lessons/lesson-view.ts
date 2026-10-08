import { Component, DestroyRef, TemplateRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { EventList } from '../cards/event-list';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { LessonContent } from './lesson-content';
import { LessonForm, cleanLesson, lessonValid } from './lesson-form';
import { LessonInput, LessonService } from './lesson.service';

/**
 * A lesson on its own page, full width (/lessons/:id; /lessons/new starts a new one): read as
 * a whole — content, then the events it's attached to — and edited right here (Edit → the
 * form in place of the content; Save / Cancel). Mobile: back + title in the toolbar.
 */
@Component({
  selector: 'app-lesson-view',
  imports: [EventList, Icon, LessonContent, LessonForm, RouterLink, ScrollArea, TranslatePipe],
  template: `
    <ng-template #bar>
      <a routerLink="/lessons" [attr.aria-label]="'action.back' | t" class="icon-plain -ml-2 shrink-0">
        <app-icon name="chevron-left" class="size-6" />
      </a>
      <span class="min-w-0 truncate text-xl font-semibold">{{ heading() }}</span>
    </ng-template>

    <main class="flex min-h-0 w-full flex-1 flex-col px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
      <app-scroll-area class="min-h-0 flex-1" contentClass="gap-6 pb-20">
        <!-- Desktop: back to the library; the title with Edit, or Cancel · Save while editing -->
        <div class="flex flex-col gap-3 mobile:hidden">
          <a routerLink="/lessons" class="text-body -ml-1 flex items-center gap-1 self-start text-[var(--accent)] active:opacity-70">
            <app-icon name="chevron-left" class="size-5" />{{ 'nav.lessons' | t }}
          </a>
          <div class="flex items-center gap-3">
            <h1 class="min-w-0 flex-1 truncate text-2xl font-semibold">{{ heading() }}</h1>
            @if (editing()) {
              <button type="button" (click)="cancel()" class="btn-secondary">{{ 'action.cancel' | t }}</button>
              <button type="button" (click)="save()" [disabled]="!canSave()" class="btn-primary disabled:opacity-50">{{ 'action.save' | t }}</button>
            } @else if (lesson()) {
              <button type="button" (click)="edit()" class="btn-secondary">{{ 'action.edit' | t }}</button>
            }
          </div>
        </div>

        @if (editing()) {
          <app-lesson-form [(value)]="draft" />
          @if (lesson()) {
            <button type="button" (click)="remove()" class="card-btn text-[var(--danger)]">{{ 'action.delete' | t }}</button>
          }
        } @else if (lesson(); as l) {
          <app-lesson-content [blocks]="l.blocks" />
          <app-event-list [lessonId]="l.id" />
        } @else if (loaded()) {
          <p class="text-body py-10 text-center opacity-40">{{ 'lessons.notFound' | t }}</p>
        }
      </app-scroll-area>
    </main>

    <!-- Mobile: Edit, or Cancel · Save while editing, floating at the bottom -->
    @if (editing()) {
      <div class="float-bottom inset-x-4 flex items-center gap-2 desktop:hidden">
        <button type="button" (click)="cancel()" class="btn-secondary">{{ 'action.cancel' | t }}</button>
        <button type="button" (click)="save()" [disabled]="!canSave()" class="btn-primary flex-1 disabled:!opacity-50">{{ 'action.save' | t }}</button>
      </div>
    } @else if (lesson()) {
      <button type="button" (click)="edit()" class="btn-secondary float-bottom right-4 desktop:hidden">{{ 'action.edit' | t }}</button>
    }
  `,
})
export class LessonView {
  private lessons = inject(LessonService);
  private router = inject(Router);
  private i18n = inject(I18nService);
  private readonly bar = viewChild<TemplateRef<unknown>>('bar');

  private readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id'))));
  private readonly isNew = computed(() => this.id() === 'new');
  protected readonly lesson = computed(() => (this.isNew() ? null : this.lessons.byId(this.id())));
  // The library has loaded: an unknown id is really missing.
  protected readonly loaded = computed(() => this.lessons.lessons().length > 0);

  // Editing: always for a new lesson; the draft and what it started from.
  private readonly editRequested = signal(false);
  protected readonly editing = computed(() => this.isNew() || this.editRequested());
  protected readonly draft = signal<LessonInput>({ title: '', blocks: [] });
  private readonly snapshot = signal(JSON.stringify(this.draft()));
  protected readonly canSave = computed(
    () => lessonValid(this.draft()) && JSON.stringify(this.draft()) !== this.snapshot(),
  );

  protected readonly heading = computed(() => {
    if (this.isNew()) return this.draft().title.trim() || this.i18n.t('lessons.new');
    return this.lesson()?.title ?? '';
  });

  constructor() {
    const toolbar = inject(ToolbarService);
    effect(() => toolbar.content.set(this.bar() ?? null));
    inject(DestroyRef).onDestroy(() => toolbar.content.set(null));
  }

  protected edit(): void {
    const l = this.lesson();
    if (!l) return;
    this.draft.set({ title: l.title, blocks: l.blocks.map((b) => ({ ...b })) });
    this.snapshot.set(JSON.stringify(this.draft()));
    this.editRequested.set(true);
  }

  protected cancel(): void {
    if (this.isNew()) this.router.navigate(['/lessons']);
    else this.editRequested.set(false);
  }

  protected save(): void {
    if (!this.canSave()) return;
    const input = cleanLesson(this.draft());
    const id = this.id();
    if (this.isNew()) {
      this.lessons.create(input, (newId) => this.router.navigate(['/lessons', newId], { replaceUrl: true }));
    } else if (id) {
      this.lessons.update(id, input);
      this.editRequested.set(false);
    }
  }

  protected remove(): void {
    const id = this.lesson()?.id;
    if (!id) return;
    this.lessons.remove(id);
    this.router.navigate(['/lessons']);
  }
}
