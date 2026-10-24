import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, output, signal, viewChildren } from '@angular/core';
import { desktop } from '../core/device';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { VisibleArea } from '../core/services/visible-area';
import { Icon, IconName } from '../core/ui';
import type { PageBlock } from './library.store';
import { linkSelection, Mark, marked, marksAt, toggleMark } from './marks';

/** A block being edited (its id: for the list's tracking, as blocks move). */
interface Item {
  id: number;
  kind: 'text' | 'card';
  text: string;
}

/** A "/" command: a card (a block set apart), or the AI. */
interface Command {
  id: 'card' | 'ai';
  icon: IconName;
  label: 'editor.card' | 'editor.ai';
  hint: 'editor.cardHint' | 'editor.aiHint';
}

const COMMANDS: Command[] = [
  { id: 'card', icon: 'page', label: 'editor.card', hint: 'editor.cardHint' },
  { id: 'ai', icon: 'sparkle', label: 'editor.ai', hint: 'editor.aiHint' },
];

const STYLES: { id: Mark; mark: string; look: string; label: 'editor.bold' | 'editor.italic' | 'editor.underline' | 'editor.strike' }[] = [
  { id: 'bold', mark: 'B', look: 'font-bold', label: 'editor.bold' },
  { id: 'italic', mark: 'I', look: 'italic font-serif', label: 'editor.italic' },
  { id: 'underline', mark: 'U', look: 'underline', label: 'editor.underline' },
  { id: 'strike', mark: 'S', look: 'line-through', label: 'editor.strike' },
];

let nextId = 1;

/**
 * A page's text, edited right on it, as the old app's (and Notion's): what's typed is text right on
 * the page; cards are blocks set apart ("/" → Card, and what the AI writes) — their marks
 * (**bold**, *italic*, __underline__, ~~strike~~, [links](…)) faded over the text alike. Text:
 * Enter, a new text from the caret on (Shift+Enter: a new line). A card: Enter, a new line; on an
 * empty last line, out of it, into text under it. Backspace at a block's start: into the one above
 * (of its kind; an empty card: back to text); ↑ ↓ at the ends: the next one; emptied and left, a
 * block goes. A tap under the last block: text there, typed at once. "/" at a line's start (or
 * after a space): the commands at the block — a card (this empty text made one, else one under
 * it), the AI (`ai`). A selection: B I U S and Link (desktop: a menu over the block; phones: the bar over
 * the keyboard, with AI and ✓ too). Each block's ⠿ (desktop: at its left under the pointer;
 * phones: at its right): dragged, it moves (a line where it'd land); tapped, its menu — duplicate,
 * delete. `blocks`: the texts it starts with (read once); `changed`: all of them, at each change.
 */
@Component({
  selector: 'app-page-editor',
  imports: [Icon, TranslatePipe],
  templateUrl: './page-editor.html',
  host: { class: 'relative block' },
})
export class PageEditor {
  readonly blocks = input<PageBlock[]>([]);
  readonly changed = output<PageBlock[]>();
  readonly ai = output<void>();

  private readonly i18n = inject(I18nService);
  protected readonly area = inject(VisibleArea);
  protected readonly desktop = desktop;
  protected readonly styles = STYLES;
  protected readonly marked = marked;

  protected readonly items = signal<Item[]>([]);
  private readonly fields = viewChildren<ElementRef<HTMLTextAreaElement>>('field');

  // The block with the caret (-1: none), and the selection in it (empty: a caret)
  protected readonly focused = signal(-1);
  protected readonly selection = signal<{ a: number; b: number }>({ a: 0, b: 0 });
  protected readonly on = computed(() => {
    const at = this.focused();
    const { a, b } = this.selection();
    return at < 0 || a === b ? [] : marksAt(this.items()[at]?.text ?? '', a, b);
  });

  // "/": at which block, what's typed after it, where the "/" is, the row picked
  protected readonly slash = signal<{ at: number; query: string; from: number; active: number } | null>(null);
  protected readonly commands = computed(() => {
    const query = this.slash()?.query.toLocaleLowerCase() ?? '';
    return COMMANDS.filter((c) => !query || this.i18n.t(c.label).toLocaleLowerCase().includes(query));
  });

  // Link: the address asked for (the selection kept meanwhile)
  protected readonly linking = signal<{ at: number; a: number; b: number } | null>(null);

  // Moving a block by its ⠿: which, where it'd land (the line: px in the editor), and its menu
  protected readonly dragging = signal<number | null>(null);
  protected readonly dropLine = signal<number | null>(null);
  protected readonly blockMenu = signal<number | null>(null);
  private drag: { from: number; startY: number; moved: boolean; to: number } | null = null;

  constructor() {
    afterNextRender(() => {
      const blocks: PageBlock[] = this.blocks().length ? this.blocks() : [{ kind: 'text', text: '' }];
      this.items.set(blocks.map((b) => ({ id: nextId++, kind: b.kind, text: b.text ?? '' })));
      setTimeout(() => this.fields().forEach((f) => this.grow(f.nativeElement)));
    });
    // (the window's width changed: the fields' heights again)
    const resize = () => this.fields().forEach((f) => this.grow(f.nativeElement));
    window.addEventListener('resize', resize);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', resize));
  }

  /** Blocks put in after the block with the caret (none: at the end) — e.g. the AI's, as cards. */
  insert(texts: string[], focusLast = false, kind: Item['kind'] = 'card'): void {
    const at = this.focused() >= 0 ? this.focused() : this.items().length - 1;
    const items = this.items();
    // (the page still empty: its empty block replaced)
    const replace = items.length === 1 && !items[0].text.trim();
    const added = texts.map((text) => ({ id: nextId++, kind, text }));
    this.items.set(replace ? added : [...items.slice(0, at + 1), ...added, ...items.slice(at + 1)]);
    this.emit();
    setTimeout(() => {
      this.fields().forEach((f) => this.grow(f.nativeElement));
      if (focusLast) this.focusAt(replace ? added.length - 1 : at + added.length, 'end');
    });
  }

  /** The caret at the start of the first block (e.g. Enter in the title). */
  focusStart(): void {
    this.focusAt(0, 'start');
  }

  /** The page as text (for the AI): the blocks, a blank line between. */
  text(): string {
    return this.items()
      .map((i) => i.text.trim())
      .filter(Boolean)
      .join('\n\n');
  }

  private emit(): void {
    this.changed.emit(this.items().map((i) => ({ kind: i.kind, text: i.text })));
  }

  // A tap under the last block: text there (the last one, if it's an empty text), typed at once
  protected typeAtEnd(): void {
    const items = this.items();
    const last = items[items.length - 1];
    if (last && last.kind === 'text' && !last.text) {
      this.focusAt(items.length - 1, 'end');
      return;
    }
    this.items.set([...items, { id: nextId++, kind: 'text', text: '' }]);
    setTimeout(() => this.focusAt(this.items().length - 1, 'start'));
  }

  private setText(at: number, text: string): void {
    this.items.update((items) => items.map((item, i) => (i === at ? { ...item, text } : item)));
    this.emit();
  }

  protected typed(at: number, field: HTMLTextAreaElement): void {
    this.setText(at, field.value);
    this.grow(field);
    this.select(at, field);
    // "/" at a line's start or after a space, the caret after it (what's typed after it narrows)
    const before = field.value.slice(0, field.selectionStart);
    const typed = /(?:^|\s)\/([\p{L}\d]{0,20})$/u.exec(before);
    if (typed) {
      const old = this.slash();
      const query = typed[1];
      this.slash.set({ at, query, from: field.selectionStart - query.length - 1, active: old?.query === query ? old.active : 0 });
    } else {
      this.slash.set(null);
    }
  }

  protected select(at: number, field: HTMLTextAreaElement): void {
    this.focused.set(at);
    this.selection.set({ a: field.selectionStart, b: field.selectionEnd });
  }

  protected key(e: KeyboardEvent, at: number, field: HTMLTextAreaElement): void {
    if (e.isComposing) return;
    const slash = this.slash();
    if (slash) {
      const count = this.commands().length;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.slash.set(null);
        return;
      }
      if (count && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        this.slash.set({ ...slash, active: (slash.active + (e.key === 'ArrowDown' ? 1 : -1) + count) % count });
        return;
      }
      if (count && (e.key === 'Enter' || e.key === 'Tab')) {
        e.preventDefault();
        this.run(this.commands()[slash.active]);
        return;
      }
    }
    // (B I U: as everywhere)
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const style = { b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()] as Mark | undefined;
      if (style) {
        e.preventDefault();
        this.style(style, at, field);
        return;
      }
    }
    const a = field.selectionStart;
    const b = field.selectionEnd;
    const text = field.value;
    const kind = this.items()[at].kind;
    if (e.key === 'Enter' && kind === 'card') {
      // A card: a new line — but on an empty last line, out of it: text under it
      if (e.shiftKey || a !== b || a !== text.length || !text.endsWith('\n')) return;
      e.preventDefault();
      const items = this.items();
      this.items.set([...items.slice(0, at), { ...items[at], text: text.slice(0, -1) }, { id: nextId++, kind: 'text', text: '' }, ...items.slice(at + 1)]);
      this.emit();
      setTimeout(() => {
        this.grow(field);
        this.focusAt(at + 1, 'start');
      });
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Text: a new text from the caret on
      e.preventDefault();
      const items = this.items();
      this.items.set([
        ...items.slice(0, at),
        { ...items[at], text: text.slice(0, a) },
        { id: nextId++, kind: 'text', text: text.slice(b) },
        ...items.slice(at + 1),
      ]);
      this.emit();
      setTimeout(() => {
        this.grow(field);
        this.focusAt(at + 1, 'start');
      });
    } else if (e.key === 'Backspace' && a === 0 && b === 0 && kind === 'card' && !text) {
      // An empty card: back to text
      e.preventDefault();
      this.items.update((items) => items.map((item, i) => (i === at ? { ...item, kind: 'text' } : item)));
      this.emit();
    } else if (e.key === 'Backspace' && a === 0 && b === 0 && at > 0 && this.items()[at - 1].kind !== kind) {
      // (another kind above: only the caret goes up, to its end)
      e.preventDefault();
      this.focusAt(at - 1, 'end');
    } else if (e.key === 'Backspace' && a === 0 && b === 0 && at > 0) {
      // Into the one above (the caret where they meet)
      e.preventDefault();
      const items = this.items();
      const above = items[at - 1].text;
      this.items.set([...items.slice(0, at - 1), { ...items[at - 1], text: above + text }, ...items.slice(at + 1)]);
      this.emit();
      setTimeout(() => this.focusAt(at - 1, above.length));
    } else if (e.key === 'ArrowUp' && a === 0 && b === 0 && at > 0) {
      e.preventDefault();
      this.focusAt(at - 1, 'end');
    } else if (e.key === 'ArrowDown' && a === text.length && at < this.items().length - 1) {
      e.preventDefault();
      this.focusAt(at + 1, 'start');
    }
  }

  // Left: emptied, it goes (one is always there); the "/" menu closes
  protected left(at: number): void {
    setTimeout(() => {
      if (this.linking() || this.blockMenu() !== null || this.dragging() !== null) return;
      const field = document.activeElement;
      if (!(field instanceof HTMLTextAreaElement) || !this.fields().some((f) => f.nativeElement === field)) {
        this.focused.set(-1);
        this.slash.set(null);
      }
      const items = this.items();
      if (items.length > 1 && !items[at]?.text.trim() && this.focused() !== at) {
        this.items.set(items.filter((_, i) => i !== at));
        this.emit();
      }
    });
  }

  // A "/" command: the "/" and what's typed after it taken out, then the command
  protected run(command: Command | undefined): void {
    const slash = this.slash();
    this.slash.set(null);
    if (!slash || !command) return;
    const field = this.fields()[slash.at]?.nativeElement;
    const text = this.items()[slash.at].text;
    const end = field?.selectionStart ?? slash.from + slash.query.length + 1;
    this.setText(slash.at, text.slice(0, slash.from) + text.slice(end));
    if (command.id === 'card') {
      // This text, if it's empty now, made a card; else a card under it
      if (!this.items()[slash.at].text.trim()) {
        this.items.update((items) => items.map((item, i) => (i === slash.at ? { ...item, kind: 'card', text: '' } : item)));
        this.emit();
        setTimeout(() => this.focusAt(slash.at, 'start'));
      } else {
        this.focused.set(slash.at);
        this.insert([''], true);
      }
    } else {
      this.ai.emit();
    }
  }

  // B I U S: on the selection (none: the marks with the caret between them)
  protected style(mark: Mark, at = this.focused(), field = this.fields()[at]?.nativeElement): void {
    if (at < 0 || !field) return;
    const { text, a, b } = toggleMark(field.value, field.selectionStart, field.selectionEnd, mark);
    this.setText(at, text);
    field.value = text;
    field.setSelectionRange(a, b);
    this.selection.set({ a, b });
    this.grow(field);
  }

  // Link: its address asked for, then the selection made a link to it
  protected startLink(): void {
    const at = this.focused();
    const field = this.fields()[at]?.nativeElement;
    if (!field) return;
    this.linking.set({ at, a: field.selectionStart, b: field.selectionEnd });
    setTimeout(() => document.querySelector<HTMLInputElement>('app-page-editor input[type=url]')?.focus());
  }

  protected applyLink(url: string): void {
    const link = this.linking();
    this.linking.set(null);
    const href = url.trim();
    if (!link) return;
    if (href) {
      const full = /^https?:\/\//i.test(href) ? href : `https://${href}`;
      const { text, at } = linkSelection(this.items()[link.at].text, link.a, link.b, full);
      this.setText(link.at, text);
      setTimeout(() => this.focusAt(link.at, at));
    } else {
      this.focusAt(link.at, link.b);
    }
  }

  // Phones' ✓: the keyboard away
  protected done(): void {
    (document.activeElement as HTMLElement | null)?.blur();
  }

  // ⠿ pressed: a drag may start (moved: it's a drag; let go without moving: its menu)
  protected gripDown(e: PointerEvent, at: number): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.drag = { from: at, startY: e.clientY, moved: false, to: at };
  }

  protected gripMove(e: PointerEvent, host: HTMLElement): void {
    const drag = this.drag;
    if (!drag) return;
    if (!drag.moved) {
      if (Math.abs(e.clientY - drag.startY) < 5) return;
      drag.moved = true;
      this.dragging.set(drag.from);
    }
    // Before the first block whose middle is under the pointer, else at the end
    const blocks = [...host.querySelectorAll<HTMLElement>('[data-block]')];
    const top = host.getBoundingClientRect().top;
    let to = blocks.length;
    let line = blocks.length ? blocks[blocks.length - 1].getBoundingClientRect().bottom - top : 0;
    for (let i = 0; i < blocks.length; i++) {
      const r = blocks[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        to = i;
        line = r.top - top - 3;
        break;
      }
    }
    drag.to = to;
    this.dropLine.set(line);
  }

  protected gripUp(): void {
    const drag = this.drag;
    this.drag = null;
    this.dropLine.set(null);
    this.dragging.set(null);
    if (!drag) return;
    if (!drag.moved) {
      this.blockMenu.set(this.blockMenu() === drag.from ? null : drag.from);
      return;
    }
    const { from, to } = drag;
    if (to === from || to === from + 1) return;
    const items = [...this.items()];
    const [moved] = items.splice(from, 1);
    items.splice(to > from ? to - 1 : to, 0, moved);
    this.items.set(items);
    this.emit();
    setTimeout(() => this.fields().forEach((f) => this.grow(f.nativeElement)));
  }

  protected duplicate(at: number): void {
    this.blockMenu.set(null);
    const items = this.items();
    this.items.set([...items.slice(0, at + 1), { ...items[at], id: nextId++ }, ...items.slice(at + 1)]);
    this.emit();
    setTimeout(() => this.fields().forEach((f) => this.grow(f.nativeElement)));
  }

  protected remove(at: number): void {
    this.blockMenu.set(null);
    const items = this.items().filter((_, i) => i !== at);
    this.items.set(items.length ? items : [{ id: nextId++, kind: 'text', text: '' }]);
    this.emit();
  }

  // The caret in a block: at its start, its end, or at a place
  private focusAt(at: number, where: 'start' | 'end' | number): void {
    const field = this.fields()[at]?.nativeElement;
    if (!field) return;
    field.focus({ preventScroll: true });
    const pos = where === 'start' ? 0 : where === 'end' ? field.value.length : where;
    field.setSelectionRange(pos, pos);
    this.select(at, field);
    field.scrollIntoView({ block: 'nearest' });
  }

  // A field as tall as its text (the page scrolls, not it)
  protected grow(field: HTMLTextAreaElement): void {
    field.style.height = 'auto';
    field.style.height = `${field.scrollHeight}px`;
  }
}
