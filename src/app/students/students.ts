import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { LessonTitleStore } from '../schedule/lesson-title.store';
import { Lesson, LessonService, LessonStatus } from '../schedule/lesson.service';
import { TranslationKey } from '../core/i18n/translations';
import { Student, StudentInput, StudentService } from './student.service';

interface EditorModel extends StudentInput {
  id: string | null;
}

@Component({
  selector: 'app-students',
  imports: [FormsModule, NgTemplateOutlet, Icon, PageSheet, TranslatePipe],
  templateUrl: './students.html',
})
export class Students {
  private service = inject(StudentService);
  private i18n = inject(I18nService);
  private readonly page = viewChild(PageSheet);
  private readonly search = viewChild<TemplateRef<unknown>>('search');

  private router = inject(Router);
  private lessons = inject(LessonService);
  private titles = inject(LessonTitleStore);

  protected readonly query = signal('');
  // Lesson to return to when the student was opened from it (/students?fromLesson=<id>).
  protected readonly returnLessonId = signal<string | null>(null);
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();

  // Alphabetical, filtered by name / email / phone.
  protected readonly visible = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    return [...this.service.students()]
      .filter((s) => !q || [s.name, s.email, s.phone].some((v) => v.toLocaleLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, this.i18n.locale()));
  });

  // Desktop details pane: the picked student, else the first one in the list.
  private readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed<Student | null>(() => {
    const list = this.visible();
    return list.find((s) => s.id === this.selectedId()) ?? list.at(0) ?? null;
  });

  protected readonly editor = signal<EditorModel | null>(null);
  // Snapshot of the editor when it opened, to tell whether anything was changed.
  private editorSnapshot = '';

  constructor() {
    // Mobile toolbar: the search field instead of a title.
    const toolbar = inject(ToolbarService);
    effect(() => toolbar.content.set(this.search() ?? null));
    inject(DestroyRef).onDestroy(() => toolbar.content.set(null));

    // The student cards list their lessons.
    this.lessons.ensureLoaded();

    // Deep link from elsewhere (e.g. a lesson): /students?id=<studentId>
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.returnLessonId.set(params.get('fromLesson'));
        const student = this.service.students().find((s) => s.id === params.get('id'));
        if (!student) return;
        this.query.set('');
        this.pick(student);
      });
  }

  protected initial(name: string): string {
    return name.trim().charAt(0).toLocaleUpperCase(this.i18n.locale());
  }

  // Row tap: desktop shows the details pane, mobile opens the editor.
  protected pick(s: Student): void {
    if (this.desktop) this.selectedId.set(s.id);
    else this.openEdit(s);
  }

  protected openNew(): void {
    this.open({ id: null, name: '', email: '', phone: '' });
  }

  protected openEdit(s: Student): void {
    this.open({ ...s });
  }

  private open(m: EditorModel): void {
    this.editor.set(m);
    this.editorSnapshot = JSON.stringify(m);
  }

  protected isDirty(m: EditorModel): boolean {
    return JSON.stringify(m) !== this.editorSnapshot;
  }

  // Save is enabled only for a named student that actually differs from what was opened.
  protected canSave(m: EditorModel): boolean {
    return !!m.name.trim() && this.isDirty(m);
  }

  // A student's lessons (matched by name — lessons store the student's name): upcoming soonest
  // first, then past most recent first.
  protected studentLessons(s: Student): { upcoming: Lesson[]; past: Lesson[] } {
    const now = Date.now();
    const mine = this.lessons.lessons().filter((l) => l.studentName === s.name);
    const end = (l: Lesson) => new Date(l.startsAt).getTime() + l.durationMinutes * 60_000;
    return {
      upcoming: mine.filter((l) => end(l) >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      past: mine.filter((l) => end(l) < now).sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    };
  }

  protected lessonDate(l: Lesson): string {
    return new Date(l.startsAt).toLocaleDateString(this.i18n.locale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  protected lessonTime(l: Lesson): string {
    const start = new Date(l.startsAt);
    const end = new Date(start.getTime() + l.durationMinutes * 60_000);
    const fmt = (d: Date) =>
      d.toLocaleTimeString(this.i18n.locale(), { hour: '2-digit', minute: '2-digit' });
    return `${fmt(start)}–${fmt(end)}`;
  }

  protected lessonTitle(l: Lesson): string {
    return this.titles.get(l.id);
  }

  protected studentById(id: string): Student | null {
    return this.service.students().find((s) => s.id === id) ?? null;
  }

  protected statusKey(status: LessonStatus): TranslationKey {
    return `lesson.status.${status}`;
  }

  // Open a lesson in the schedule (leaving any student editor without bouncing back).
  protected openLesson(l: Lesson): void {
    this.returnLessonId.set(null);
    this.editor.set(null);
    this.router.navigate(['/schedule'], { queryParams: { lesson: l.id } });
  }

  // Editor gone: if the student was opened from a lesson, go back to that lesson.
  protected onEditorClosed(): void {
    this.editor.set(null);
    if (this.returnLessonId()) this.backToLesson();
  }

  protected backToLesson(): void {
    const lesson = this.returnLessonId();
    this.returnLessonId.set(null);
    this.router.navigate(['/schedule'], { queryParams: { lesson } });
  }

  // Animates the page sheet out; its (closed) output then clears the editor.
  protected closeEditor(): void {
    this.page()?.close();
  }

  protected save(): void {
    const m = this.editor();
    if (!m || !this.canSave(m)) return;
    const input: StudentInput = {
      name: m.name.trim(),
      email: m.email.trim(),
      phone: m.phone.trim(),
    };
    if (m.id) this.service.update(m.id, input);
    else this.service.create(input);
    this.closeEditor();
  }

  protected remove(): void {
    const m = this.editor();
    if (!m?.id) return;
    this.service.remove(m.id);
    this.closeEditor();
  }
}
