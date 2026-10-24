import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { Editor, JSONContent } from '@tiptap/core';
import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { desktop } from '../core/device';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { VisibleArea } from '../core/services/visible-area';
import { Icon } from '../core/ui';
import { BlockDrag } from './block-drag';
import { BLOCKS, BlockKind, STYLES, TextStyle } from './blocks';

// The page's text as it's drawn (the editor's own markup: its blocks styled from here)
const PROSE =
  'min-h-40 pb-24 text-body leading-relaxed text-fg outline-none ' +
  '[&_p]:my-1 ' +
  '[&_h1]:mt-6 [&_h1]:mb-1 [&_h1]:text-[1.625rem] [&_h1]:leading-tight [&_h1]:font-semibold ' +
  '[&_h2]:mt-5 [&_h2]:mb-1 [&_h2]:text-[1.3125rem] [&_h2]:leading-snug [&_h2]:font-semibold ' +
  '[&_h3]:mt-4 [&_h3]:mb-0.5 [&_h3]:text-[1.0625rem] [&_h3]:font-semibold ' +
  '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_li_p]:my-0.5 [&_li::marker]:text-fg-secondary ' +
  '[&_blockquote]:my-2 [&_blockquote]:border-l-[3px] [&_blockquote]:border-fg [&_blockquote]:pl-4 ' +
  '[&_hr]:my-5 [&_hr]:border-separator ' +
  '[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 ' +
  '[&_code]:rounded-md [&_code]:bg-tint [&_code]:px-1 [&_code]:text-[0.9em] ' +
  // (an empty line's hint, gray: the one with the caret; the first, while the page is empty)
  '[&_.is-empty]:before:pointer-events-none [&_.is-empty]:before:float-left [&_.is-empty]:before:h-0 ' +
  '[&_.is-empty]:before:text-fg-secondary [&_.is-empty]:before:content-[attr(data-placeholder)]';

/**
 * A page's text, edited in place (TipTap): paragraphs, headings, lists, quotes, dividers; bold,
 * italic, underline, strike, links. Typing as in Notion / Markdown makes them too ("# ", "- ",
 * "1. ", "> ", "**…**"). `content`: the document it starts with (read once); `changed`: the whole
 * document, at each change.
 * Desktop: "/" opens the blocks' menu at the caret (typed on, it narrows; ↑ ↓ Enter, Esc); a
 * selection, its menu over it (B I U S, Link); by the block under the pointer, + (a block under
 * it: the "/" menu) and ⠿ (BlockDrag: dragged, the block moves; clicked, its menu — turn into,
 * duplicate, delete). Phones: ⠿ at the right of the caret's block, the same; while it's written in, a bar just over the
 * keyboard — the blocks and B I U S on a capsule, ✓ (the keyboard away) at its right.
 */
@Component({
  selector: 'app-editor',
  // (desktop: room at its left for + and ⠿, the pointer over it still the page's)
  host: { class: 'relative block desktop:-ml-14 desktop:pl-14', '(mousemove)': 'drag?.hover($event.clientY)', '(mouseleave)': 'drag?.hide()' },
  imports: [Icon, TranslatePipe],
  templateUrl: './editor.html',
})
export class PageEditor {
  readonly content = input<JSONContent | null>(null);
  readonly changed = output<JSONContent>();

  private readonly i18n = inject(I18nService);
  protected readonly area = inject(VisibleArea);
  protected readonly desktop = desktop;
  protected readonly blocks = BLOCKS;
  protected readonly styles = STYLES;

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly linkField = viewChild<ElementRef<HTMLInputElement>>('linkField');
  private editor: Editor | null = null;
  protected drag: BlockDrag | null = null;

  // A block's menu (its ⠿ clicked): where, which block
  protected readonly blockMenu = signal<{ x: number; y: number; pos: number } | null>(null);
  protected readonly turnInto = BLOCKS.filter((b) => b.id !== 'divider');

  // What's on where the caret is (redrawn at each change and move): the styles and blocks
  protected readonly on = signal<ReadonlySet<string>>(new Set());
  protected readonly focused = signal(false);

  // Desktop: the selection's menu (where: over the selection, px on the screen); Link asking for the address
  protected readonly selection = signal<{ x: number; y: number } | null>(null);
  protected readonly linking = signal(false);
  protected readonly link = signal('');

  // Desktop: "/" — where its menu goes, what's typed after it, where the "/" is, the row picked
  protected readonly slash = signal<{ x: number; y: number; query: string; from: number; active: number } | null>(null);
  protected readonly slashItems = computed(() => {
    const query = this.slash()?.query.toLocaleLowerCase() ?? '';
    return this.blocks.filter((b) => !query || this.i18n.t(b.label).toLocaleLowerCase().includes(query) || b.words.includes(query));
  });

  constructor() {
    afterNextRender(() => this.start());
    // (the page scrolled: the grip follows its block — phones; desktop: hidden till the pointer moves)
    const onScroll = () => (desktop ? this.drag?.hide() : this.focused() && this.drag?.caret());
    document.addEventListener('scroll', onScroll, true);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('scroll', onScroll, true);
      this.editor?.destroy();
    });
  }

  /** The caret in it: at the start (e.g. Enter in the title). */
  focus(at: 'start' | 'end' = 'start'): void {
    this.editor?.commands.focus(at);
  }

  private start(): void {
    this.editor = new Editor({
      element: this.host().nativeElement,
      content: this.content() ?? '',
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
        }),
        Placeholder.configure({
          placeholder: ({ node }) =>
            node.type.name === 'heading' ? this.i18n.t('editor.heading') : this.i18n.t(desktop ? 'editor.hint' : 'editor.hintPhone'),
        }),
      ],
      editorProps: {
        attributes: { class: PROSE },
        // (phones: the caret kept clear of the bar over the keyboard)
        scrollMargin: { top: 80, bottom: desktop ? 24 : 96, left: 0, right: 0 },
        scrollThreshold: { top: 80, bottom: desktop ? 24 : 96, left: 0, right: 0 },
        handleKeyDown: (_view, e) => this.slashKey(e),
      },
      onUpdate: ({ editor }) => {
        this.changed.emit(editor.getJSON());
        this.refresh();
        if (desktop) this.drag?.hide();
      },
      onSelectionUpdate: () => this.refresh(),
      onFocus: () => {
        this.focused.set(true);
        this.refresh();
      },
      onBlur: () => {
        this.focused.set(false);
        // (a click in the selection's menu takes the focus a moment: the menu stays for it)
        if (!this.linking()) this.selection.set(null);
        this.slash.set(null);
        if (!desktop && !this.drag?.dragging()) this.drag?.hide();
      },
    });
    this.drag = new BlockDrag(this.editor, desktop ? 'left' : 'right', (pos, x, y) => this.blockMenu.set({ pos, x, y }));
  }

  // What's on, the selection's menu, the "/" menu: as the caret is now
  private refresh(): void {
    const editor = this.editor;
    if (!editor) return;
    const on = new Set<string>();
    for (const s of this.styles) if (editor.isActive(s.id)) on.add(s.id);
    for (const b of this.blocks) if (b.active?.(editor)) on.add(b.id);
    if (editor.isActive('link')) on.add('link');
    this.on.set(on);

    const { from, to, empty, $from } = editor.state.selection;
    if (!desktop) {
      if (editor.isFocused) this.drag?.caret();
      return;
    }
    // A selection: its menu over its start
    if (!empty && editor.isFocused) {
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      this.selection.set({ x: start.left, y: Math.min(start.top, end.top) });
    } else if (!this.linking()) {
      this.selection.set(null);
    }
    // "/" at the start of a line or after a space, the caret after it (and what's typed after it)
    const before = empty ? $from.parent.textBetween(0, $from.parentOffset, undefined, '￼') : '';
    const typed = /(?:^|\s)\/([\p{L}\d]{0,20})$/u.exec(before);
    if (typed) {
      const at = editor.view.coordsAtPos(from);
      const query = typed[1];
      const old = this.slash();
      this.slash.set({ x: at.left, y: at.bottom + 6, query, from: from - query.length - 1, active: old && old.query === query ? old.active : 0 });
    } else {
      this.slash.set(null);
    }
  }

  // The "/" menu's keys (open: the editor doesn't get them)
  private slashKey(e: KeyboardEvent): boolean {
    const slash = this.slash();
    if (!slash) return false;
    const count = this.slashItems().length;
    if (e.key === 'Escape') {
      this.slash.set(null);
      return true;
    }
    if (!count) return false;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const step = e.key === 'ArrowDown' ? 1 : -1;
      this.slash.set({ ...slash, active: (slash.active + step + count) % count });
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      this.make(this.slashItems()[slash.active]);
      return true;
    }
    return false;
  }

  // A block picked in the "/" menu: the "/" and what's typed after it gone, the block made
  protected make(block: BlockKind): void {
    const editor = this.editor;
    const slash = this.slash();
    if (!editor) return;
    if (slash) editor.chain().focus().deleteRange({ from: slash.from, to: editor.state.selection.from }).run();
    this.slash.set(null);
    block.make(editor);
  }

  // Phones' bar: a block (picked again: back to text)
  protected toggleBlock(block: BlockKind): void {
    if (!this.editor) return;
    if (this.on().has(block.id) && block.id !== 'text') this.editor.chain().focus().setParagraph().run();
    else block.make(this.editor);
  }

  protected style(style: TextStyle): void {
    if (this.editor) style.toggle(this.editor);
  }

  // Link: on a link, off; else its address asked for
  protected startLink(): void {
    const editor = this.editor;
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    this.link.set('');
    this.linking.set(true);
    setTimeout(() => this.linkField()?.nativeElement.focus());
  }

  protected applyLink(): void {
    const editor = this.editor;
    const href = this.link().trim();
    this.linking.set(false);
    if (!editor) return;
    if (href) editor.chain().focus().extendMarkRange('link').setLink({ href: /^[a-z]+:/i.test(href) ? href : `https://${href}` }).run();
    else editor.commands.focus();
  }

  protected cancelLink(): void {
    this.linking.set(false);
    this.editor?.commands.focus();
  }

  // + by a block: an empty line under it, "/" in it (its menu opens)
  protected add(pos: number): void {
    const editor = this.editor;
    const node = editor?.state.doc.nodeAt(pos);
    if (!editor || !node) return;
    const at = pos + node.nodeSize;
    editor.chain().insertContentAt(at, { type: 'paragraph', content: [{ type: 'text', text: '/' }] }).setTextSelection(at + 2).focus().run();
  }

  // The block's menu: turned into another kind (the caret in it first)
  protected turn(pos: number, block: BlockKind): void {
    this.blockMenu.set(null);
    this.editor?.chain().focus().setTextSelection(pos + 1).run();
    if (this.editor) block.make(this.editor);
  }

  protected duplicate(pos: number): void {
    this.blockMenu.set(null);
    const editor = this.editor;
    const node = editor?.state.doc.nodeAt(pos);
    if (editor && node) editor.chain().insertContentAt(pos + node.nodeSize, node.toJSON()).focus().run();
  }

  protected remove(pos: number): void {
    this.blockMenu.set(null);
    const editor = this.editor;
    const node = editor?.state.doc.nodeAt(pos);
    if (editor && node) editor.chain().deleteRange({ from: pos, to: pos + node.nodeSize }).focus().run();
    this.drag?.hide();
  }

  // Phones' ✓: the keyboard away
  protected done(): void {
    this.editor?.commands.blur();
  }
}
