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
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
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

  protected readonly query = signal('');
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

    // Deep link from elsewhere (e.g. a lesson): /students?id=<studentId>
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
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
