import { Editor } from '@tiptap/core';
import { TranslationKey } from '../core/i18n/translations';

/** A kind of block a page has (the "/" menu's rows, the phones' bar's): its mark, its name, how it's made. */
export interface BlockKind {
  id: string;
  // (a short mark on its tile, as Notion's: T, H1, •, …)
  mark: string;
  label: TranslationKey;
  // (also found by these, typed after "/")
  words: string;
  make: (editor: Editor) => void;
  active?: (editor: Editor) => boolean;
}

export const BLOCKS: BlockKind[] = [
  { id: 'text', mark: 'T', label: 'editor.text', words: 'text paragraph', make: (e) => e.chain().focus().setParagraph().run(), active: (e) => e.isActive('paragraph') },
  { id: 'h1', mark: 'H1', label: 'editor.h1', words: 'heading title h1', make: (e) => e.chain().focus().setHeading({ level: 1 }).run(), active: (e) => e.isActive('heading', { level: 1 }) },
  { id: 'h2', mark: 'H2', label: 'editor.h2', words: 'heading subtitle h2', make: (e) => e.chain().focus().setHeading({ level: 2 }).run(), active: (e) => e.isActive('heading', { level: 2 }) },
  { id: 'h3', mark: 'H3', label: 'editor.h3', words: 'heading h3', make: (e) => e.chain().focus().setHeading({ level: 3 }).run(), active: (e) => e.isActive('heading', { level: 3 }) },
  { id: 'bullets', mark: '•', label: 'editor.bullets', words: 'list bullets ul', make: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive('bulletList') },
  { id: 'numbers', mark: '1.', label: 'editor.numbers', words: 'list numbers ol', make: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive('orderedList') },
  { id: 'quote', mark: '❝', label: 'editor.quote', words: 'quote', make: (e) => e.chain().focus().toggleBlockquote().run(), active: (e) => e.isActive('blockquote') },
  { id: 'divider', mark: '—', label: 'editor.divider', words: 'divider line hr', make: (e) => e.chain().focus().setHorizontalRule().run() },
];

/** A style of the text selected (B I U S): its mark, its name, how it's switched. */
export interface TextStyle {
  id: 'bold' | 'italic' | 'underline' | 'strike';
  mark: string;
  label: TranslationKey;
  // (the mark drawn as it does: bold in bold, …)
  look: string;
  toggle: (editor: Editor) => void;
}

export const STYLES: TextStyle[] = [
  { id: 'bold', mark: 'B', label: 'editor.bold', look: 'font-bold', toggle: (e) => e.chain().focus().toggleBold().run() },
  { id: 'italic', mark: 'I', label: 'editor.italic', look: 'italic font-serif', toggle: (e) => e.chain().focus().toggleItalic().run() },
  { id: 'underline', mark: 'U', label: 'editor.underline', look: 'underline', toggle: (e) => e.chain().focus().toggleUnderline().run() },
  { id: 'strike', mark: 'S', label: 'editor.strike', look: 'line-through', toggle: (e) => e.chain().focus().toggleStrike().run() },
];
