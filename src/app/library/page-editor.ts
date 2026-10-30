import { NgTemplateOutlet } from '@angular/common';
import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, output, signal, viewChildren } from '@angular/core';
import { desktop } from '../core/device';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { VisibleArea } from '../core/services/visible-area';
import { Icon, IconName, UiSheet } from '../core/ui';
import { LibraryStore, type PageBlock } from './library.store';
import { UiTip } from '../core/ui/tip/tip';
import { linkSelection, Mark, marked, marksAt, toggleMark } from './marks';

/** A block being edited (its id: for the list's tracking, as blocks move). */
interface Item {
  id: number;
  text: string;
  // (only for the teacher: a lock on it)
  private?: boolean;
}

/** A command at the caret between blocks: a new text, or the assistant. */
interface Command {
  id: 'text' | 'ai' | 'paste';
  icon: IconName;
  label: 'editor.text' | 'editor.ai' | 'editor.paste';
  // (Paste's: what's been copied itself — copied())
  hint?: 'editor.textHint' | 'editor.aiHint';
}

// (what's been copied — a block's menu: Copy, the page's: Copy content — put in there)
const PASTE: Command = { id: 'paste', icon: 'enter', label: 'editor.paste' };

const COMMANDS: Command[] = [
  { id: 'text', icon: 'page', label: 'editor.text', hint: 'editor.textHint' },
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
 * A page's text, edited right on it, as the old app's: blocks of text, each a card (set apart) —
 * a "/" in one is just text; their marks (**bold**, *italic*, __underline__, ~~strike~~,
 * [links](…)) faded over the text. Enter: a new line; on an empty last line, out of it — a new
 * text under it. Backspace in an empty one: it goes, the caret up to the one above; ↑ ↓ at the
 * ends: the next one; emptied and left, a text goes. Between two blocks or under the last, a
 * click: desktops — the caret there (a line with its hint and the commands: a new text, the
 * assistant, `ai`; what's typed or pasted, a new block there); phones — a new text, typed at
 * once (under the last: + Text and Assistant too). A selection: B I U S and Link (desktop: a menu
 * over the block; phones: the bar over the keyboard, with the assistant and ✓ too). Each block's
 * ⠿ (desktop: at its left under the pointer; phones: at its right): dragged, it moves (a line
 * where it'd land); tapped, its menu (desktop: a popup; phones: a sheet, just its words) — only
 * for me (a lock on it), copy, duplicate, delete. `blocks`: what it starts with (read once);
 * `changed`: all of them, at each change.
 */
@Component({
  selector: 'app-page-editor',
  imports: [Icon, NgTemplateOutlet, TranslatePipe, UiSheet, UiTip],
  templateUrl: './page-editor.html',
  host: { class: 'relative block' },
})
export class PageEditor {
  readonly blocks = input<PageBlock[]>([]);
  readonly changed = output<PageBlock[]>();
  readonly ai = output<void>();

  private readonly i18n = inject(I18nService);
  private readonly store = inject(LibraryStore);
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

  // Desktops: the caret between blocks (a click between them, under the last): a line with its
  // hint, the commands at once (what's after a "/" filters them); what's typed or pasted there is
  // a new block in that place
  protected readonly caret = signal<number | null>(null);
  protected readonly caretMenu = signal(false);
  protected readonly caretQuery = signal('');
  protected readonly caretActive = signal(0);
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

  // Desktops: the block the pointer's at the height of (anywhere across the page, not only over
  // it): its ⠿ shows
  protected readonly near = signal<number | null>(null);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    if (desktop) {
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
    }
    afterNextRender(() => {
      // (an empty page: desktops — no block, the caret's hint instead; phones — one empty block)
      const blocks = this.blocks().length || desktop ? this.blocks() : [{ kind: 'card' as const, text: '' }];
      this.items.set(blocks.map((b) => ({ id: nextId++, text: b.text ?? '', private: !!b.private })));
      if (!blocks.length) this.openCaret(0, false, false);
      setTimeout(() => this.fields().forEach((f) => this.grow(f.nativeElement)));
    });
    // (the window's width changed: the fields' heights again)
    const resize = () => this.fields().forEach((f) => this.grow(f.nativeElement));
    window.addEventListener('resize', resize);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', resize));
  }

  /** Texts put in after the block with the caret (none: at the end) — e.g. the assistant's. */
  insert(texts: string[], focusLast = false): void {
    const items = this.items();
    // (where: the caret's place the assistant was asked from; else after the caret's block)
    const at = this.aiAt ?? (this.focused() >= 0 ? this.focused() + 1 : items.length);
    // (the page still empty: its empty block replaced)
    const replace = items.length === 1 && !items[0].text.trim();
    const added = texts.map((text) => ({ id: nextId++, text }));
    this.items.set(replace ? added : [...items.slice(0, at), ...added, ...items.slice(at)]);
    if (this.aiAt !== null) this.aiAt = replace ? added.length : at + added.length; // (the next ones after them)
    this.emit();
    setTimeout(() => {
      this.fields().forEach((f) => this.grow(f.nativeElement));
      if (focusLast) this.focusAt(replace ? added.length - 1 : at + added.length - 1, 'end');
    });
  }

  /** The caret at the start of the first block (e.g. Enter in the title). */
  focusStart(): void {
    if (this.items().length) this.focusAt(0, 'start');
    else this.openCaret(0, false);
  }

  /** The page as text (for the AI): the blocks, a blank line between. */
  text(): string {
    return this.items()
      .map((i) => i.text.trim())
      .filter(Boolean)
      .join('\n\n');
  }

  private emit(): void {
    this.changed.emit(this.items().map((i) => ({ kind: 'card' as const, text: i.text, private: i.private || undefined })));
  }

  // A click between two blocks: desktops — the caret there (and the commands); phones — a new text
  protected between(at: number): void {
    if (desktop) this.openCaret(at);
    else this.insertAt(at);
  }

  private openCaret(at: number, menu = true, focus = true): void {
    this.caret.set(at);
    this.caretMenu.set(menu);
    this.caretQuery.set('');
    this.caretActive.set(0);
    if (focus) setTimeout(() => document.querySelector<HTMLInputElement>('app-page-editor [data-caret-input]')?.focus());
  }

  // (desktops: an empty page has no block, the caret's hint there instead; phones keep one)
  private readonly least = desktop ? 0 : 1;
  private emptied(): void {
    if (!this.items().length) this.openCaret(0, false, false);
  }

  protected caretTyped(field: HTMLInputElement): void {
    const v = field.value;
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
    const text = e.clipboardData?.getData('text/plain') ?? '';
    e.preventDefault();
    if (text.trim()) this.blockAtCaret(text);
  }

  // (a new block at the caret with this text, the caret on in it)
  private blockAtCaret(v: string): void {
    const at = this.caret() ?? this.items().length;
    this.caret.set(null);
    const items = this.items();
    this.items.set([...items.slice(0, at), { id: nextId++, text: v }, ...items.slice(at)]);
    this.emit();
    setTimeout(() => {
      this.fields().forEach((f) => this.grow(f.nativeElement));
      this.focusAt(at, 'end');
    });
  }

  protected caretKey(e: KeyboardEvent): void {
    const count = this.caretMenu() ? this.caretCommands().length : 0;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.caret.set(null);
    } else if (count && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      this.caretActive.set((this.caretActive() + (e.key === 'ArrowDown' ? 1 : -1) + count) % count);
    } else if (count && e.key === 'Enter') {
      e.preventDefault();
      this.runAtCaret(this.caretCommands()[this.caretActive()]);
    }
  }

  // A command at the caret: a new text there, or the assistant (its texts to go in there)
  protected runAtCaret(command: Command | undefined): void {
    const at = this.caret();
    this.caret.set(null);
    if (at === null || !command) return;
    if (command.id === 'text') {
      this.insertAt(at);
    } else if (command.id === 'paste') {
      const added = (this.store.clipboard() ?? []).map((b) => ({ id: nextId++, text: b.text ?? '', private: !!b.private }));
      const items = this.items();
      this.items.set([...items.slice(0, at), ...added, ...items.slice(at)]);
      this.emit();
      setTimeout(() => this.fields().forEach((f) => this.grow(f.nativeElement)));
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

  // A tap between two blocks: a new text there, typed at once
  protected insertAt(at: number): void {
    const items = this.items();
    this.items.set([...items.slice(0, at), { id: nextId++, text: '' }, ...items.slice(at)]);
    setTimeout(() => this.focusAt(at, 'start'));
  }

  // A tap under the last block: a new text there (the last one, if it's empty), typed at once
  protected typeAtEnd(): void {
    const items = this.items();
    if (desktop) {
      this.openCaret(items.length);
      return;
    }
    const last = items[items.length - 1];
    if (last && !last.text) {
      this.focusAt(items.length - 1, 'end');
      return;
    }
    this.items.set([...items, { id: nextId++, text: '' }]);
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
    if (e.key === 'Enter' && !e.shiftKey && a === b && a === text.length && text.endsWith('\n')) {
      // Enter on an empty last line: out of it — a new text under it
      e.preventDefault();
      const items = this.items();
      this.items.set([...items.slice(0, at), { ...items[at], text: text.slice(0, -1) }, { id: nextId++, text: '' }, ...items.slice(at + 1)]);
      this.emit();
      setTimeout(() => {
        this.grow(field);
        this.focusAt(at + 1, 'start');
      });
    } else if (e.key === 'Backspace' && a === 0 && b === 0 && !text && this.items().length > this.least) {
      // Backspace in an empty one: it goes, the caret up (or down, at the top)
      e.preventDefault();
      this.items.update((items) => items.filter((_, i) => i !== at));
      this.emit();
      setTimeout(() => (!this.items().length ? this.openCaret(0, false) : at > 0 ? this.focusAt(at - 1, 'end') : this.focusAt(0, 'start')));
    } else if (e.key === 'Backspace' && a === 0 && b === 0 && at > 0) {
      // (at the start of one: the caret up, to the end of the one above)
      e.preventDefault();
      this.focusAt(at - 1, 'end');
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
      if (items.length > this.least && !items[at]?.text.trim() && this.focused() !== at) {
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
    setTimeout(() => this.fields().forEach((f) => this.grow(f.nativeElement)));
  }

  // The block's menu: only for the teacher (a lock on it) or not
  protected togglePrivate(at: number): void {
    this.items.update((items) => items.map((item, i) => (i === at ? { ...item, private: !item.private } : item)));
    this.emit();
  }

  // The block's menu: its text copied (with its marks)
  protected copy(at: number): void {
    const item = this.items()[at];
    this.store.clipboard.set([{ kind: 'card', text: item.text, private: item.private || undefined }]);
    navigator.clipboard?.writeText(item.text).catch(() => {});
  }

  protected duplicate(at: number): void {
    const items = this.items();
    this.items.set([...items.slice(0, at + 1), { ...items[at], id: nextId++ }, ...items.slice(at + 1)]);
    this.emit();
    setTimeout(() => this.fields().forEach((f) => this.grow(f.nativeElement)));
  }

  protected remove(at: number): void {
    const items = this.items().filter((_, i) => i !== at);
    this.items.set(items.length || desktop ? items : [{ id: nextId++, text: '' }]);
    this.emit();
    this.emptied();
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
