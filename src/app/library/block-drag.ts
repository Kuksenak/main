import { signal } from '@angular/core';
import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

/** A block of the page (one of the document's own children): where it starts, its element. */
interface Block {
  pos: number;
  dom: HTMLElement;
}

/**
 * Moving a page's blocks by their grip (⠿), as Notion's — the editor's part of it: where the grip
 * goes (`handle`: by the block under the pointer, or, on phones, the caret's — at its right, as
 * iOS's reorder grips), the line where a dragged block would land (`line`), and the move itself.
 * Pointer events, so a finger drags as a mouse does; nothing moves until it's let go. A grip only
 * clicked (not moved): `clicked` (the block's menu).
 */
export class BlockDrag {
  readonly handle = signal<{ x: number; y: number; pos: number } | null>(null);
  readonly line = signal<{ x: number; y: number; width: number } | null>(null);
  readonly dragging = signal(false);

  private from: Block | null = null;
  private startY = 0;
  private target: number | null = null;
  private scroller: HTMLElement | null = null;
  private scrollTimer = 0;

  constructor(
    private readonly editor: Editor,
    private readonly side: 'left' | 'right',
    private readonly clicked: (pos: number, x: number, y: number) => void,
  ) {}

  // The document's blocks, in order, with their elements
  private blocks(): Block[] {
    const view = this.editor.view;
    const blocks: Block[] = [];
    view.state.doc.forEach((_node, pos) => {
      const dom = view.nodeDOM(pos);
      if (dom instanceof HTMLElement) blocks.push({ pos, dom });
    });
    return blocks;
  }

  /** The grip by the block at this height on the screen (desktop: the pointer's); none there: hidden. */
  hover(y: number): void {
    if (this.dragging()) return;
    const block = this.blocks().find(({ dom }) => {
      const r = dom.getBoundingClientRect();
      return y >= r.top - 4 && y <= r.bottom + 4;
    });
    if (block) this.show(block);
    else this.handle.set(null);
  }

  /** The grip by the caret's block (phones); none: hidden. */
  caret(): void {
    if (this.dragging()) return;
    const { $from } = this.editor.state.selection;
    const pos = $from.depth ? $from.before(1) : null;
    const block = pos === null ? undefined : this.blocks().find((b) => b.pos === pos);
    if (block) this.show(block);
    else this.handle.set(null);
  }

  hide(): void {
    if (!this.dragging()) this.handle.set(null);
  }

  // The grip at the block's first line, at its left (desktop) or right (phones)
  private show({ pos, dom }: Block): void {
    const r = dom.getBoundingClientRect();
    const line = parseFloat(getComputedStyle(dom).lineHeight) || 26;
    const first = dom.tagName === 'HR' ? r.height : Math.min(r.height, line);
    // (a list: by its first item's line, its top margin skipped)
    const top = dom.tagName === 'UL' || dom.tagName === 'OL' || dom.tagName === 'BLOCKQUOTE'
      ? (dom.firstElementChild?.getBoundingClientRect().top ?? r.top)
      : r.top;
    this.handle.set({ x: this.side === 'left' ? r.left - 28 : r.right + 4, y: top + first / 2, pos });
  }

  // Its grip pressed: the drag may start
  start(e: PointerEvent): void {
    const handle = this.handle();
    if (!handle) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.from = this.blocks().find((b) => b.pos === handle.pos) ?? null;
    this.startY = e.clientY;
    this.target = null;
    this.scroller = this.editor.view.dom.closest('main');
  }

  move(e: PointerEvent): void {
    const from = this.from;
    if (!from) return;
    if (!this.dragging()) {
      if (Math.abs(e.clientY - this.startY) < 4) return;
      this.dragging.set(true);
      from.dom.style.opacity = '0.35';
    }
    // Where it'd land: before the first block whose middle is under the pointer, else at the end
    const blocks = this.blocks();
    const box = this.editor.view.dom.getBoundingClientRect();
    let target = this.editor.state.doc.content.size;
    let y = blocks.length ? blocks[blocks.length - 1].dom.getBoundingClientRect().bottom + 2 : box.top;
    for (const { pos, dom } of blocks) {
      const r = dom.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        target = pos;
        y = r.top - 2;
        break;
      }
    }
    this.target = target;
    this.line.set({ x: box.left, y, width: box.width });
    this.handle.update((h) => (h ? { ...h, y: e.clientY } : h));
    this.autoScroll(e.clientY);
  }

  // Let go: moved there (dragged), or its menu (only clicked)
  end(e: PointerEvent): void {
    const from = this.from;
    this.from = null;
    clearInterval(this.scrollTimer);
    this.line.set(null);
    if (!from) return;
    if (!this.dragging()) {
      this.clicked(from.pos, e.clientX, e.clientY);
      return;
    }
    from.dom.style.opacity = '';
    this.dragging.set(false);
    if (this.target !== null) this.moveBlock(from.pos, this.target);
    this.handle.set(null);
  }

  // The block at `from` moved to `to` (a place between blocks), the caret in it
  private moveBlock(from: number, to: number): void {
    const { state, view } = this.editor;
    const node = state.doc.nodeAt(from);
    if (!node || to === from || to === from + node.nodeSize) return;
    const tr = state.tr.delete(from, from + node.nodeSize);
    const at = tr.mapping.map(to);
    tr.insert(at, node);
    tr.setSelection(TextSelection.near(tr.doc.resolve(at + 1)));
    view.dispatch(tr.scrollIntoView());
    view.focus();
  }

  // Near the top or the bottom of the page's scroll: it scrolls on while held there
  private autoScroll(y: number): void {
    clearInterval(this.scrollTimer);
    const scroller = this.scroller;
    if (!scroller) return;
    const r = scroller.getBoundingClientRect();
    const step = y < r.top + 90 ? -8 : y > r.bottom - 90 ? 8 : 0;
    if (step) this.scrollTimer = window.setInterval(() => scroller.scrollBy(0, step), 16);
  }
}
