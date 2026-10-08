import { Component, DestroyRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { SelectField, SelectOption } from '../core/ui/select/select';
import { STUDENT_LEVELS, Student, StudentInput, StudentService } from './student.service';

interface EditorModel extends StudentInput {
  id: string | null;
}

@Component({
  selector: 'app-students',
  imports: [FormsModule, Icon, PageSheet, SelectField, TranslatePipe],
  templateUrl: './students.html',
})
export class Students {
  private service = inject(StudentService);
  private i18n = inject(I18nService);
  private readonly page = viewChild(PageSheet);

  protected readonly query = signal('');

  // Alphabetical, filtered by name / email / phone.
  protected readonly visible = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    return [...this.service.students()]
      .filter((s) => !q || [s.name, s.email, s.phone].some((v) => v.toLocaleLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, this.i18n.locale()));
  });

  protected readonly levelOptions: SelectOption[] = STUDENT_LEVELS.map((l) => ({ label: l, value: l }));

  protected readonly editor = signal<EditorModel | null>(null);
  // Snapshot of the editor when it opened, to tell whether anything was changed.
  private editorSnapshot = '';

  constructor() {
    // Page title in the mobile toolbar.
    const toolbar = inject(ToolbarService);
    effect(() => toolbar.title.set(this.i18n.t('nav.students')));
    inject(DestroyRef).onDestroy(() => toolbar.title.set(''));
  }

  protected initial(name: string): string {
    return name.trim().charAt(0).toLocaleUpperCase(this.i18n.locale());
  }

  protected openNew(): void {
    this.open({ id: null, name: '', email: '', phone: '', level: 'A1', note: '' });
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
      level: m.level,
      note: m.note.trim(),
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
