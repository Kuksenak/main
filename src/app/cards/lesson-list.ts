import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { NavStack } from '../core/services/nav-stack.service';
import { Icon } from '../core/ui/icon/icon';
import { Section } from '../core/ui/section/section';
import { LessonTitleStore } from '../schedule/lesson-title.store';
import { Lesson, LessonService } from '../schedule/lesson.service';
import { GroupService } from '../students/group.service';

/**
 * Lessons of a student or group (lessons store who they're for by name): Upcoming soonest
 * first, then Past most recent first, each a collapsible section (Past folded by default).
 * A tap opens the lesson card on top.
 */
@Component({
  selector: 'app-lesson-list',
  imports: [Icon, Section, TranslatePipe],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!upcoming().length && !past().length) {
      <p class="text-footnote px-4 opacity-50">{{ 'students.noLessons' | t }}</p>
    }
    @for (g of sections(); track g.key) {
      @if (g.items.length) {
        <app-section [title]="g.key | t" [count]="g.items.length" [key]="g.key" [initiallyOpen]="g.open">
          <div class="card">
            @for (l of g.items; track l.id) {
              <button type="button" (click)="open(l)" class="list-row w-full py-2 text-left">
                <span class="color-bar" [style.background]="color(l)"></span>
                <div class="min-w-0 flex-1 leading-tight">
                  <p class="truncate font-medium" [class.line-through]="l.status === 'Cancelled'">{{ date(l) }}</p>
                  <p class="text-footnote truncate opacity-50">
                    {{ time(l) }}@if (titles.get(l.id)) { · {{ titles.get(l.id) }} }
                  </p>
                </div>
                @if (l.status !== 'Scheduled') {
                  <span class="badge">{{ statusKey(l) | t }}</span>
                }
                <app-icon name="chevron-right" class="row-chevron" />
              </button>
            }
          </div>
        </app-section>
      }
    }
  `,
})
export class LessonList {
  readonly who = input.required<string>();

  private lessons = inject(LessonService);
  private groups = inject(GroupService);
  private i18n = inject(I18nService);
  private stack = inject(NavStack);
  protected titles = inject(LessonTitleStore);

  private readonly mine = computed(() => this.lessons.lessons().filter((l) => l.studentName === this.who()));
  private end = (l: Lesson) => new Date(l.startsAt).getTime() + l.durationMinutes * 60_000;
  protected readonly upcoming = computed(() =>
    this.mine()
      .filter((l) => this.end(l) >= Date.now())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  );
  protected readonly past = computed(() =>
    this.mine()
      .filter((l) => this.end(l) < Date.now())
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
  );
  protected readonly sections = computed(() => [
    { key: 'students.upcoming' as TranslationKey, items: this.upcoming(), open: true },
    { key: 'students.past' as TranslationKey, items: this.past(), open: false },
  ]);

  constructor() {
    this.lessons.ensureLoaded();
  }

  protected open(l: Lesson): void {
    this.stack.push({ kind: 'lesson', id: l.id });
  }

  protected color(l: Lesson): string {
    return this.groups.lessonColor(l.studentName);
  }

  protected date(l: Lesson): string {
    return new Date(l.startsAt).toLocaleDateString(this.i18n.locale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  protected time(l: Lesson): string {
    const start = new Date(l.startsAt);
    const end = new Date(this.end(l));
    const fmt = (d: Date) => d.toLocaleTimeString(this.i18n.locale(), { hour: '2-digit', minute: '2-digit' });
    return `${fmt(start)}–${fmt(end)}`;
  }

  protected statusKey(l: Lesson): TranslationKey {
    return `lesson.status.${l.status}`;
  }
}
