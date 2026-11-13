import { NgTemplateOutlet } from '@angular/common';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, output, signal, viewChild, viewChildren } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon, IconName } from '../core/ui/icon/icon';
import { UiMenu, UiMenuItem, UiMenuSeparator } from '../core/ui/menu';
import { LibraryStore, type PageBlock } from './library.store';
import { UiTip } from '../core/ui/tip/tip';
import { imageOf, linkSelection, Mark, marked, marksAt, shown, toggleMark } from './marks';

/** A block being edited (its id: for the list's tracking, as blocks move). */
interface Item {
  id: number;
  text: string;
  // (only for the teacher: a lock on it)
  private?: boolean;
  // (a to-do: its box — the text kept as "- [ ] …" / "- [x] …", the box's part not in the field)
  todo?: 'open' | 'done';
}

const TODO = /^- \[( |x)\] ?/;

// A block's text as an item (a to-do's box taken off it), and back
function toItem(text: string, priv?: boolean): Item {
  const m = TODO.exec(text);
  return { id: nextId++, text: m ? text.slice(m[0].length) : text, private: priv || undefined, todo: m ? (m[1] === 'x' ? 'done' : 'open') : undefined };
}
function fullText(item: Item): string {
  return item.todo ? `- [${item.todo === 'done' ? 'x' : ' '}] ${item.text}` : item.text;
}

/** A command at a new line ("/"): an image (by its link), the assistant, Paste. */
interface Command {
  id: 'image' | 'ai' | 'todo' | 'paste';
  icon: IconName;
  label: 'editor.image' | 'editor.ai' | 'editor.todo' | 'editor.paste';
  // (Paste's: what's been copied itself — copied())
  hint?: 'editor.imageLink' | 'editor.aiHint' | 'editor.todoHint';
}

// (what's been copied — a block's menu: Copy, the page's: Copy content — put in there)
const PASTE: Command = { id: 'paste', icon: 'enter', label: 'editor.paste' };

const COMMANDS: Command[] = [
  { id: 'image', icon: 'image', label: 'editor.image', hint: 'editor.imageLink' },
  { id: 'ai', icon: 'sparkle', label: 'editor.ai', hint: 'editor.aiHint' },
  { id: 'todo', icon: 'todo', label: 'editor.todo', hint: 'editor.todoHint' },
];

const STYLES: { id: Mark; mark: string; look: string; label: 'editor.bold' | 'editor.italic' | 'editor.underline' | 'editor.strike' }[] = [
  { id: 'bold', mark: 'B', look: 'font-bold', label: 'editor.bold' },
  { id: 'italic', mark: 'I', look: 'italic font-serif', label: 'editor.italic' },
  { id: 'underline', mark: 'U', look: 'underline', label: 'editor.underline' },
  { id: 'strike', mark: 'S', look: 'line-through', label: 'editor.strike' },
];

let nextId = 1;

/**
 * Desktop: a page's text, edited right on it (as Notion's): blocks of text — a "/" in one is just
 * text; their marks (**bold**, *italic*, __underline__, ~~strike~~, [links](…)) faded over the
 * text. Enter: a new block (at the end: a new line under it); Shift+Enter: a new line in it.
 * Backspace in an empty one: it goes, the caret up to the one above; ↑ ↓ at the ends: the next one;
 * Backspace at the start of one: it joins the one above. Emptied and left, a block goes. Under the
 * last, a click: a new line there (its hint; after "/", the commands: an image, the assistant, `ai`;
 * what's typed or pasted, a new block there). A selection: B I U S and Link (a menu over the block). Each block's ⠿ (at its
 * left under the pointer): dragged, it moves (a line where it'd land); clicked, its menu — only for
 * me (a lock on it), copy, duplicate, delete. `blocks`: what it starts with (read once); `changed`:
 * all of them, at each change. (Phones show a page read only: PageView.)
 */
@Component({
  selector: 'app-page-editor',
  imports: [Icon, NgTemplateOutlet, TranslatePipe, UiMenu, UiMenuItem, UiMenuSeparator, UiTip],
  templateUrl: './page-editor.html',
  host: { class: 'relative block' },
})
export class PageEditor {
  readonly blocks = input<PageBlock[]>([]);
  readonly changed = output<PageBlock[]>();
  readonly ai = output<void>();

  private readonly i18n = inject(I18nService);
  private readonly store = inject(LibraryStore);
  protected readonly styles = STYLES;
  protected readonly marked = marked;
  protected readonly shown = shown;
  protected readonly imageOf = imageOf;

  protected readonly items = signal<Item[]>([]);
  private readonly fields = viewChildren<ElementRef<HTMLTextAreaElement>>('field');
  private readonly caretField = viewChild<ElementRef<HTMLInputElement>>('caretField');
  private readonly linkField = viewChild<ElementRef<HTMLInputElement>>('linkField');

  // The block with the caret (-1: none), and the selection in it (empty: a caret)
  protected readonly focused = signal(-1);
  protected readonly selection = signal<{ a: number; b: number }>({ a: 0, b: 0 });
  protected readonly on = computed(() => {
    const at = this.focused();
    const { a, b } = this.selection();
    return at < 0 || a === b ? [] : marksAt(this.items()[at]?.text ?? '', a, b);
  });

  // The caret between blocks (a click between them, under the last): a line with its
  // hint, the commands at once (what's after a "/" filters them); what's typed or pasted there is
  // a new block in that place
  protected readonly caret = signal<number | null>(null);
  protected readonly caretMenu = signal(false);
  protected readonly caretQuery = signal('');
  protected readonly caretActive = signal(0);
  // (Image picked: the line asks for its link)
  protected readonly caretImage = signal(false);
  protected readonly caretCommands = computed(() => {
    const query = this.caretQuery().toLocaleLowerCase();
    const all = this.store.clipboard()?.length ? [...COMMANDS, PASTE] : COMMANDS;
    return all.filter((c) => !query || this.i18n.t(c.label).toLocaleLowerCase().includes(query));
  });
  // Paste's hint: the copied text's start, "+2" for the blocks after it
  protected readonly copied = computed(() => {
    const blocks = this.store.clipboard() ?? [];
    const first = (blocks[0]?.text ?? '').replace(/\s+/g, ' ').trim();
    return first + (blocks.length > 1 ? ` +${blocks.length - 1}` : '');
  });
  // (the assistant asked from the caret: its texts go in there)
  private aiAt: number | null = null;

  // Link: the address asked for (the selection kept meanwhile)
  protected readonly linking = signal<{ at: number; a: number; b: number } | null>(null);

  // Moving a block by its ⠿: which, where it'd land (the line: px in the editor), and its menu
  protected readonly dragging = signal<number | null>(null);
  protected readonly dropLine = signal<number | null>(null);
  protected readonly blockMenu = signal<number | null>(null);
  private drag: { from: number; startY: number; moved: boolean; to: number } | null = null;

  // The block the pointer's at the height of (anywhere across the page, not only over
  // it): its ⠿ shows
  protected readonly near = signal<number | null>(null);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const onMove = (e: PointerEvent) => {
      if (this.drag) return;
      const blocks = [...this.host.nativeElement.querySelectorAll<HTMLElement>('[data-block]')];
      const box = this.host.nativeElement.getBoundingClientRect();
      // (the page's own column and its sides — not the sidebar)
      const inPage = e.clientX > box.left - 120 && e.clientX < window.innerWidth;
      const at = inPage
        ? blocks.findIndex((b) => {
            const r = b.getBoundingClientRect();
            return e.clientY >= r.top && e.clientY <= r.bottom;
          })
        : -1;
      const near = at < 0 ? null : at;
      if (near !== this.near()) this.near.set(near);
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    inject(DestroyRef).onDestroy(() => document.removeEventListener('pointermove', onMove));
    afterNextRender(() => {
      // (an empty page: no block, the caret's hint instead)
      const blocks = this.blocks();
      this.items.set(blocks.map((b) => toItem(b.text ?? '', b.private)));
      if (!blocks.length) this.openCaret(0, false, false);
      this.growAll();
    });
    // (the window's width changed: the fields' heights again)
    const resize = () => this.growAll();
    window.addEventListener('resize', resize);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', resize));
  }

  /** Texts put in after the block with the caret (none: at the end) — e.g. the assistant's. */
  insert(blocks: { text: string; private?: boolean }[], focusLast = false): void {
    const items = this.items();
    // (where: the caret's place the assistant was asked from; else after the caret's block)
    const at = this.aiAt ?? (this.focused() >= 0 ? this.focused() + 1 : items.length);
    // (the page still empty: its empty block replaced)
    const replace = items.length === 1 && !items[0].text.trim();
    const added = blocks.map((b) => toItem(b.text, b.private));
    this.items.set(replace ? added : putIn(items, at, added));
    if (this.aiAt !== null) this.aiAt = replace ? added.length : at + added.length; // (the next ones after them)
    this.emit();
    this.growAll(() => focusLast && this.focusAt(replace ? added.length - 1 : at + added.length - 1, 'end'));
  }

  /** The caret at the start of the first block (e.g. Enter in the title). */
  focusStart(): void {
    if (this.items().length) this.focusAt(0, 'start');
    else this.openCaret(0, false);
  }

  /** The page as text (for the AI): the blocks, a blank line between. */
  text(): string {
    return this.items()
      .map((i) => fullText(i).trim())
      .filter(Boolean)
      .join('\n\n');
  }

  private emit(): void {
    this.changed.emit(this.items().map((i) => ({ kind: 'card' as const, text: fullText(i), private: i.private || undefined })));
  }

  // A click between two blocks or under the last: the caret there (and the commands)
  protected openCaret(at: number, menu = true, focus = true, image = false): void {
    this.caret.set(at);
    this.caretMenu.set(menu && !image);
    this.caretImage.set(image);
    this.caretQuery.set('');
    this.caretActive.set(0);
    if (focus) setTimeout(() => this.caretField()?.nativeElement.focus());
  }

  // (an empty page has no block, the caret's hint there instead)
  private emptied(): void {
    if (!this.items().length) this.openCaret(0, false, false);
  }

  protected caretTyped(field: HTMLInputElement): void {
    const v = field.value;
    if (this.caretImage()) return; // (its link: put in at Enter)
    if (v.startsWith('/') || !v) {
      // ("/" typed where its menu was shut — an empty page, the title's Enter: it opens)
      if (v) this.caretMenu.set(true);
      this.caretQuery.set(v.slice(1));
      this.caretActive.set(0);
      return;
    }
    this.blockAtCaret(v);
  }

  // Ctrl+V there: a new block with what's pasted (its lines kept)
  protected caretPaste(e: ClipboardEvent): void {
    if (this.caretImage()) return; // (the link pasted in the field)
    const text = e.clipboardData?.getData('text/plain') ?? '';
    e.preventDefault();
    if (text.trim()) this.blockAtCaret(text);
  }

  // (a new block at the caret with this text, the caret on in it)
  private blockAtCaret(v: string): void {
    const at = this.caret() ?? this.items().length;
    this.caret.set(null);
    const items = this.items();
    this.items.set(putIn(items, at, [{ id: nextId++, text: v }]));
    this.emit();
    this.growAll(() => this.focusAt(at, 'end'));
  }

  protected caretKey(e: KeyboardEvent): void {
    const count = this.caretMenu() ? this.caretCommands().length : 0;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.caret.set(null);
    } else if (this.caretImage() && e.key === 'Enter') {
      // (Image's link: a block of its own — ![](link))
      e.preventDefault();
      const link = (e.target as HTMLInputElement).value.trim();
      if (!link) return;
      const full = /^https?:\/\//i.test(link) ? link : `https://${link}`;
      this.blockAtCaret(`![](${full})`);
    } else if (count && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      this.caretActive.set((this.caretActive() + (e.key === 'ArrowDown' ? 1 : -1) + count) % count);
    } else if (count && e.key === 'Enter') {
      e.preventDefault();
      this.runAtCaret(this.caretCommands()[this.caretActive()]);
    }
  }

  // A command at the new line: an image there (its link asked for), or the assistant (its texts to go in there)
  protected runAtCaret(command: Command | undefined): void {
    const at = this.caret();
    this.caret.set(null);
    if (at === null || !command) return;
    if (command.id === 'image') {
      this.openCaret(at, false, true, true);
    } else if (command.id === 'todo') {
      this.newBlock(at, { todo: 'open' });
    } else if (command.id === 'paste') {
      const added = (this.store.clipboard() ?? []).map((b) => toItem(b.text ?? '', b.private));
      this.items.set(putIn(this.items(), at, added));
      this.emit();
      this.growAll();
    } else {
      this.aiAt = at;
      this.ai.emit();
    }
  }

  // (left: the caret goes — not for a click on its commands)
  protected caretLeft(): void {
    setTimeout(() => {
      // (an empty page keeps it, its hint)
      if (!document.activeElement?.hasAttribute('data-caret-input') && this.items().length) this.caret.set(null);
      else if (!this.items().length) this.caretMenu.set(false);
    }, 120);
  }

  // (a new block at `at` — e.g. a to-do — the caret in it)
  private newBlock(at: number, extra: Partial<Item> = {}): void {
    this.items.set(putIn(this.items(), at, [{ id: nextId++, text: '', ...extra }]));
    this.emit();
    this.growAll(() => this.focusAt(at, 'start'));
  }

  // A to-do's box: ticked, or not
  protected toggleTodo(at: number): void {
    this.items.update((items) => items.map((x, i) => (i === at && x.todo ? { ...x, todo: x.todo === 'done' ? 'open' : 'done' } : x)));
    this.emit();
  }

  private setText(at: number, text: string): void {
    this.items.update((items) => items.map((item, i) => (i === at ? { ...item, text } : item)));
    this.emit();
  }

  protected typed(at: number, field: HTMLTextAreaElement): void {
    this.setText(at, field.value);
    this.grow(field);
    this.select(at, field);
  }

  protected select(at: number, field: HTMLTextAreaElement): void {
    this.aiAt = null;
    this.focused.set(at);
    this.selection.set({ a: field.selectionStart, b: field.selectionEnd });
  }

  protected key(e: KeyboardEvent, at: number, field: HTMLTextAreaElement): void {
    if (e.isComposing) return;
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
    if (e.key === 'Enter' && !e.shiftKey) {
      // Enter: a new block (Shift+Enter: a new line in this one) — at the end, a new line under it
      // (its hint, "/" for the commands); inside, what's after the caret goes on into a block of its own
      e.preventDefault();
      const item = this.items()[at];
      // (a to-do: the next one under it; an empty one — no more to-dos: a plain line instead)
      if (item.todo && !text) {
        this.items.set(this.items().filter((_, i) => i !== at));
        this.emit();
        this.openCaret(at, false);
        return;
      }
      if (a === text.length && !item.todo) {
        this.openCaret(at + 1, false);
        return;
      }
      const kept = this.items().map((x, i) => (i === at ? { ...x, text: text.slice(0, a) } : x));
      this.items.set(putIn(kept, at + 1, [{ id: nextId++, text: text.slice(b), private: item.private, todo: item.todo && 'open' }]));
      field.value = text.slice(0, a);
      this.emit();
      this.growAll(() => this.focusAt(at + 1, 'start'));
    } else if (e.key === 'Backspace' && a === 0 && b === 0 && this.items()[at]?.todo) {
      // (at a to-do's start: its box goes, the text stays)
      e.preventDefault();
      this.items.update((items) => items.map((x, i) => (i === at ? { ...x, todo: undefined } : x)));
      this.emit();
    } else if (e.key === 'Backspace' && a === 0 && b === 0 && !text && this.items().length) {
      // Backspace in an empty one: it goes, the caret up (or down, at the top)
      e.preventDefault();
      this.items.update((items) => items.filter((_, i) => i !== at));
      this.emit();
      setTimeout(() => (!this.items().length ? this.openCaret(0, false) : at > 0 ? this.focusAt(at - 1, 'end') : this.focusAt(0, 'start')));
    } else if (e.key === 'Backspace' && a === 0 && b === 0 && at > 0) {
      // (at the start of one: it joins the one above — not an image — the caret where they meet)
      e.preventDefault();
      const above = this.items()[at - 1];
      if (imageOf(above.text)) return;
      const join = above.text.length;
      this.items.set(this.items().flatMap((x, i) => (i === at ? [] : i === at - 1 ? [{ ...x, text: x.text + text }] : [x])));
      this.emit();
      this.growAll(() => this.focusAt(at - 1, join));
    } else if (e.key === 'ArrowUp' && a === 0 && b === 0 && at > 0) {
      e.preventDefault();
      this.focusAt(at - 1, 'end');
    } else if (e.key === 'ArrowDown' && a === text.length && at < this.items().length - 1) {
      e.preventDefault();
      this.focusAt(at + 1, 'start');
    }
  }

  // Left: emptied, it goes (one is always there)
  protected left(at: number): void {
    setTimeout(() => {
      if (this.linking() || this.blockMenu() !== null || this.dragging() !== null) return;
      const field = document.activeElement;
      if (!(field instanceof HTMLTextAreaElement) || !this.fields().some((f) => f.nativeElement === field)) {
        this.focused.set(-1);
      }
      const items = this.items();
      if (!items[at]?.text.trim() && this.focused() !== at) {
        this.items.set(items.filter((_, i) => i !== at));
        this.emit();
        this.emptied();
      }
    });
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
    setTimeout(() => this.linkField()?.nativeElement.focus());
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
    // (the line in the middle of the gap it'd land in; the gap's the one between two blocks)
    const rects = blocks.map((b) => b.getBoundingClientRect());
    const gap = rects.length > 1 ? rects[1].top - rects[0].bottom : 10;
    let to = rects.length;
    let mid = rects.length ? rects[rects.length - 1].bottom + gap / 2 : 0;
    for (let i = 0; i < rects.length; i++) {
      if (e.clientY < rects[i].top + rects[i].height / 2) {
        to = i;
        mid = i ? (rects[i - 1].bottom + rects[i].top) / 2 : rects[i].top - gap / 2;
        break;
      }
    }
    const line = mid - top - 1;
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
    this.growAll();
  }

  // The block's menu: only for the teacher (a lock on it) or not
  protected togglePrivate(at: number): void {
    this.items.update((items) => items.map((item, i) => (i === at ? { ...item, private: !item.private } : item)));
    this.emit();
  }

  // The block's menu: its text copied (with its marks)
  protected copy(at: number): void {
    const item = this.items()[at];
    this.store.clipboard.set([{ kind: 'card', text: fullText(item), private: item.private || undefined }]);
    navigator.clipboard?.writeText(fullText(item)).catch(() => {});
  }

  protected duplicate(at: number): void {
    const items = this.items();
    this.items.set(putIn(items, at + 1, [{ ...items[at], id: nextId++ }]));
    this.emit();
    this.growAll();
  }

  protected remove(at: number): void {
    this.items.set(this.items().filter((_, i) => i !== at));
    this.emit();
    this.emptied();
  }

  // The caret in a block: at its start, its end, or at a place
  protected focusAt(at: number, where: 'start' | 'end' | number): void {
    const field = this.fields()[at]?.nativeElement;
    if (!field) return;
    field.focus({ preventScroll: true });
    const pos = where === 'start' ? 0 : where === 'end' ? field.value.length : where;
    field.setSelectionRange(pos, pos);
    this.select(at, field);
    field.scrollIntoView({ block: 'nearest' });
  }

  // (all the fields as tall as their texts, once drawn; then `after`)
  private growAll(after?: () => void): void {
    setTimeout(() => {
      this.fields().forEach((f) => this.grow(f.nativeElement));
      after?.();
    });
  }

  // A field as tall as its text (the page scrolls, not it)
  protected grow(field: HTMLTextAreaElement): void {
    field.style.height = 'auto';
    field.style.height = `${field.scrollHeight}px`;
  }
}

// (the items with these put in at `at`)
function putIn(items: Item[], at: number, added: Item[]): Item[] {
  return [...items.slice(0, at), ...added, ...items.slice(at)];
}
