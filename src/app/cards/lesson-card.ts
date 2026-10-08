import { Component, DestroyRef, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { StackEntry } from '../core/services/nav-stack.service';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { Sheet } from '../core/ui/sheet/sheet';
import { Toggle } from '../core/ui/toggle';
import { LessonContent } from '../lessons/lesson-content';
import { LessonForm, cleanLesson, lessonValid } from '../lessons/lesson-form';
import { LessonInput, LessonService, shareUrl } from '../lessons/lesson.service';
import { EventList } from './event-list';

/**
 * A lesson, opened on the NavStack nearly full-screen (minimal margins): its content, edited in
 * place (Edit → the form instead of the content; Save returns to reading). ⓘ opens a sheet with
 * the public link switch and the events using the lesson. A new lesson (id null) starts in the form.
 * Opened from its link (/lessons/:id, see Lessons) it follows the URL: closing goes back to
 * /lessons, and leaving that URL (browser back) closes it.
 */
@Component({
  selector: 'app-lesson-card',
  imports: [EventList, Icon, LessonContent, LessonForm, PageSheet, Sheet, Toggle, TranslatePipe],
  template: `
    <app-page-sheet
      #page
      [wide]="true"
      [title]="heading()"
      [actions]="editing()"
      [dirty]="editing() && dirty()"
      [canSave]="canSave()"
      [deletable]="editing() && !!id()"
      (save)="save()"
      (delete)="remove()"
      (closed)="onClosed()"
    >
      <!-- Mobile top bar (reading): ⓘ and Edit, round -->
      @if (!editing()) {
        <ng-container ngProjectAs="[barEnd]">
          <button #infoBtnMobile type="button" (click)="openInfo(infoBtnMobile)" [attr.aria-label]="'lessons.info' | t" class="icon-btn">
            <app-icon name="info" class="size-6" />
          </button>
          <button type="button" (click)="edit()" [attr.aria-label]="'action.edit' | t" class="icon-btn">
            <app-icon name="pencil" class="size-6" />
          </button>
        </ng-container>
      }

      <div class="flex flex-col gap-6">
        <!-- Desktop: the title with ⓘ and Edit while reading -->
        @if (!editing()) {
          <div class="flex items-center gap-3 mobile:hidden">
            <h1 class="min-w-0 flex-1 text-2xl font-semibold">{{ heading() }}</h1>
            <button #infoBtn type="button" (click)="openInfo(infoBtn)" [attr.aria-label]="'lessons.info' | t" class="icon-btn">
              <app-icon name="info" class="size-5" />
            </button>
            <button type="button" (click)="edit()" class="btn-secondary">{{ 'action.edit' | t }}</button>
          </div>
        }

        @if (editing()) {
          <app-lesson-form [(value)]="draft" />
        } @else if (lesson(); as l) {
          <app-lesson-content [blocks]="l.blocks" />
        }
      </div>
    </app-page-sheet>

    <!-- ⓘ: public link (switch; ⧉ copies it while on) and the events using this lesson -->
    @if (infoOrigin(); as origin) {
      @if (lesson(); as l) {
        <app-sheet [origin]="origin" (closed)="infoOrigin.set(null)">
          <div class="flex flex-col gap-6 desktop:gap-4">
            <div class="flex flex-col gap-1.5">
              <div class="card">
                <div class="list-row">
                  <span class="flex-1">{{ 'lessons.public' | t }}</span>
                  @if (l.shareToken; as token) {
                    <button type="button" (click)="copy(token)" [attr.aria-label]="'lessons.copy' | t" class="icon-plain !text-[var(--text)]">
                      <app-icon [name]="copied() ? 'check' : 'copy'" class="size-6" />
                    </button>
                  }
                  <app-toggle [checked]="!!l.shareToken" (checkedChange)="setPublic($event)" [attr.aria-label]="'lessons.public' | t" />
                </div>
              </div>
              <p class="text-footnote px-4 opacity-50">{{ 'lessons.publicHint' | t }}</p>
            </div>
            <app-event-list [lessonId]="l.id" />
          </div>
        </app-sheet>
      }
    }
  `,
})
export class LessonCard implements OnInit {
  readonly entry = input.required<StackEntry>();
  readonly closed = output<void>();

  private lessons = inject(LessonService);
  private i18n = inject(I18nService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private readonly page = viewChild.required<PageSheet>('page');

  // The lesson shown: the entry's, or the one just created from this card.
  private readonly createdId = signal<string | null>(null);
  protected readonly id = computed(() => this.entry().id ?? this.createdId());
  protected readonly lesson = computed(() => this.lessons.byId(this.id()));

  // Editing: from the start for a new lesson; the draft and what it started from.
  private readonly editRequested = signal(false);
  protected readonly editing = computed(() => !this.id() || this.editRequested());
  protected readonly draft = signal<LessonInput>({ title: '', blocks: [] });
  private readonly snapshot = signal(JSON.stringify(this.draft()));
  protected readonly dirty = computed(() => JSON.stringify(this.draft()) !== this.snapshot());
  protected readonly canSave = computed(() => lessonValid(this.draft()) && this.dirty());

  protected readonly heading = computed(() => {
    if (this.editing()) return this.draft().title.trim() || this.i18n.t('lessons.new');
    return this.lesson()?.title ?? '';
  });

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

  protected readonly copied = signal(false);
  // The ⓘ sheet, open under this button.
  protected readonly infoOrigin = signal<HTMLElement | null>(null);

  protected openInfo(origin: HTMLElement): void {
    this.infoOrigin.set(origin);
  }

  protected setPublic(on: boolean): void {
    const id = this.id();
    if (id) this.lessons.share(id, on);
  }

  protected copy(token: string): void {
    navigator.clipboard?.writeText(shareUrl(token)).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      },
      () => {},
    );
  }

  protected edit(): void {
    const l = this.lesson();
    if (!l) return;
    this.draft.set({ title: l.title, blocks: l.blocks.map((b) => ({ ...b })) });
    this.snapshot.set(JSON.stringify(this.draft()));
    this.editRequested.set(true);
  }

  protected save(): void {
    if (!this.canSave()) return;
    const input = cleanLesson(this.draft());
    const id = this.id();
    if (id) this.lessons.update(id, input);
    else this.lessons.create(input, (newId) => this.createdId.set(newId));
    this.editRequested.set(false);
  }

  protected remove(): void {
    const id = this.id();
    if (!id) return;
    this.lessons.remove(id);
    this.page().close();
  }
}
