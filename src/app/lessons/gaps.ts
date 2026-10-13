import { LessonBlock } from './lesson.service';

/** Answers in gaps blocks: block (its place in the lesson) → each gap's word written / option picked, in order. */
export type LessonFills = Record<number, string[]>;

/** A gap: to write in, or to choose (`options`); `answers` — the accepted ones (empty: none set). */
export interface Gap {
  gap: number;
  answers: string[];
  options?: string[];
}

/** A line of a gaps block: plain text and gaps (numbered through the whole block, in order). */
export type GapPart = { text: string } | Gap;

// [to write in] or {to|choose}
const GAP = /\[([^[\]\n]*)\]|\{([^{}\n]*)\}/g;

/**
 * A gaps block's text (a whole task) as lines of parts: "tu [envoies]" → "tu ", gap 0 to write
 * (envoies); "She {*goes|go} home" → "She ", gap 1 to choose (goes or go, goes right). [a|b]:
 * either is right; []: none set; {a|b} without a star: none set.
 */
export function gapLines(text: string | null): GapPart[][] {
  let n = 0;
  return itemLines(text ?? '').map((line) => {
    const parts: GapPart[] = [];
    let at = 0;
    for (const m of line.matchAll(GAP)) {
      if (m.index > at) parts.push({ text: line.slice(at, m.index) });
      parts.push({ gap: n++, ...spec(m) });
      at = m.index + m[0].length;
    }
    if (at < line.length || !parts.length) parts.push({ text: line.slice(at) });
    return parts;
  });
}

// Items run together on one line ("… 1. Les riverains … 2. Les piétons …"): each on its own line
// (only where the line is cut — the gaps' order, and so the answers, stay as they are)
const INLINE_ITEM = / (?=\d{1,2}[.)] +\S)/g;
function itemLines(text: string): string[] {
  return text.split('\n').flatMap((line) => ((line.match(/ \d{1,2}[.)] +\S/g)?.length ?? 0) >= 2 ? line.split(INLINE_ITEM) : [line]));
}

/**
 * A task written before tasks had an instruction of their own: its first line, when it's just
 * text, is the instruction.
 */
export function splitInstruction(b: LessonBlock): LessonBlock {
  if (b.kind !== 'gaps' || b.instruction?.trim()) return b;
  const [first, ...rest] = (b.text ?? '').split('\n');
  if (!first.trim() || !rest.length || first.match(GAP)) return b;
  return { ...b, instruction: first.trim(), text: rest.join('\n') };
}

/**
 * Any block of an older lesson as a task (a heading and a body) — what lessons are made of now;
 * pictures stay pictures. A text: its first line the heading (if it has more), the rest the body; a heading: its heading; a checklist: its items as
 * lines; a one-question exercise: the question with its options to choose from; a link: its
 * label and address.
 */
export function asTask(b: LessonBlock): LessonBlock {
  const t = blockAsTask(b);
  // One text per task: its heading, bold, as the first line
  if (t.kind !== 'gaps' || !t.instruction?.trim()) return t;
  const heading = `**${t.instruction.trim().replace(/\*\*/g, '')}**`;
  return { ...t, instruction: null, text: t.text?.trim() ? `${heading}\n${t.text}` : heading };
}

function blockAsTask(b: LessonBlock): LessonBlock {
  const base: LessonBlock = { kind: 'gaps', text: null, url: null, private: !!b.private, instruction: null };
  switch (b.kind) {
    case 'gaps':
      return splitInstruction(b);
    case 'image':
      return b;
    case 'text':
      return b;
    case 'heading':
      return { ...b, kind: 'text', text: b.text?.trim() ? `**${b.text.trim()}**` : b.text };
    case 'checklist':
      return { ...base, text: (b.items ?? []).join('\n') };
    case 'exercise': {
      const options = (b.options ?? []).map((o, i) => (i === b.answer ? '*' : '') + o.replace(/[|{}]/g, ' '));
      return { ...base, text: options.length ? `${b.text ?? ''} {${options.join('|')}}`.trim() : b.text };
    }
    case 'link':
      return { ...b, kind: 'text', url: null, text: [b.text, b.url].filter((x) => !!x?.trim()).join(' ') };
    default:
      // (its first line, if there are more, the heading)
      return splitInstruction({ ...base, text: b.text });
  }
}

/** A block as students get it: the answers taken out ([] to write in, choices unstarred). */
export function forStudents(b: LessonBlock): LessonBlock {
  const text = (b.text ?? '')
    .replace(/\[[^[\]\n]*\]/g, '[]')
    .replace(/\{([^{}\n]*)\}/g, (_, inside: string) => `{${inside.replace(/(^|\|)\s*\*/g, '$1')}}`);
  return { ...b, text, private: false };
}

/** A task's text cut at its gaps (`kind`: 'gap' to write in, 'choice'), for highlighting them as typed. */
export type MarkedKind = 'gap' | 'choice' | 'link' | 'syntax';

// A gap, a choice or a link; then the style marks in the plain parts
const PIECE = /\[[^[\]\n]*\]|\{[^{}\n]*\}|<([^<>|\n]+)(\|https?:\/\/[^<>\s]+>)/g;
const STYLE_MARK = /\*\*(?=[^*\n]+\*\*)|(?<=\*\*[^*\n]+)\*\*|__(?=[^_\n]+__)|(?<=__[^_\n]+)__|~~(?=[^~\n]+~~)|(?<=~~[^~\n]+)~~/g;

export function marked(text: string): { t: string; kind?: MarkedKind }[] {
  const out: { t: string; kind?: MarkedKind }[] = [];
  const plain = (t: string) => {
    let at = 0;
    for (const m of t.matchAll(STYLE_MARK)) {
      if (m.index > at) out.push({ t: t.slice(at, m.index) });
      out.push({ t: m[0], kind: 'syntax' });
      at = m.index + m[0].length;
    }
    if (at < t.length) out.push({ t: t.slice(at) });
  };
  let at = 0;
  for (const m of text.matchAll(PIECE)) {
    if (m.index > at) plain(text.slice(at, m.index));
    if (m[1] !== undefined) {
      // A link: "<" and "|https://…>" faded, its text like a link
      out.push({ t: '<', kind: 'syntax' }, { t: m[1], kind: 'link' }, { t: m[2], kind: 'syntax' });
    } else {
      out.push({ t: m[0], kind: m[0].startsWith('[') ? 'gap' : 'choice' });
    }
    at = m.index + m[0].length;
  }
  plain(text.slice(at));
  // (a last empty line still takes its height)
  out.push({ t: text.endsWith('\n') || !text ? ' ' : '' });
  return out;
}

export type Mark = 'bold' | 'italic' | 'underline' | 'strike' | 'gap' | 'choice' | 'link';

// A piece of markup around [a, b) (or the selection is that piece): where it starts and ends
interface Found {
  start: number;
  end: number;
  inner: string;
}

function around(text: string, a: number, b: number, open: string, close: string): Found | null {
  // The marks just outside the selection
  if (text.slice(a - open.length, a) === open && text.slice(b, b + close.length) === close) {
    return { start: a - open.length, end: b + close.length, inner: text.slice(a, b) };
  }
  // …or the selection includes them
  const sel = text.slice(a, b);
  if (sel.length >= open.length + close.length && sel.startsWith(open) && sel.endsWith(close)) {
    return { start: a, end: b, inner: sel.slice(open.length, sel.length - close.length) };
  }
  return null;
}

// A gap / choice / link the selection is inside of
function inside(text: string, a: number, b: number, re: RegExp): RegExpMatchArray | null {
  for (const m of text.matchAll(re)) {
    if ((m.index ?? 0) <= a && b <= (m.index ?? 0) + m[0].length) return m;
  }
  return null;
}

const LINK = /<([^<>|\n]+)\|(https?:\/\/[^<>\s]+)>/g;
const CHOICE = /\{([^{}\n]*)\}/g;
const WRITE = /\[([^[\]\n]*)\]/g;

/** The markup the selection [a, b) already has (for the editor's menu). */
export function marksAt(text: string, a: number, b: number): Mark[] {
  const out: Mark[] = [];
  if (around(text, a, b, '**', '**')) out.push('bold');
  else if (around(text, a, b, '*', '*')) out.push('italic');
  if (around(text, a, b, '__', '__')) out.push('underline');
  if (around(text, a, b, '~~', '~~')) out.push('strike');
  if (inside(text, a, b, WRITE)) out.push('gap');
  if (inside(text, a, b, CHOICE)) out.push('choice');
  if (inside(text, a, b, LINK)) out.push('link');
  return out;
}

/** The text with the selection's `mark` taken off: the new text and where the plain part now is. */
export function unmark(text: string, a: number, b: number, mark: Mark): { text: string; a: number; b: number } | null {
  const pair = { bold: ['**', '**'], italic: ['*', '*'], underline: ['__', '__'], strike: ['~~', '~~'] } as Record<string, [string, string]>;
  if (pair[mark]) {
    const f = around(text, a, b, ...pair[mark]);
    if (!f) return null;
    return { text: text.slice(0, f.start) + f.inner + text.slice(f.end), a: f.start, b: f.start + f.inner.length };
  }
  const m = inside(text, a, b, mark === 'gap' ? WRITE : mark === 'choice' ? CHOICE : LINK);
  if (!m) return null;
  // A gap: its answer; a choice: the right option (else the first); a link: its text
  const plain =
    mark === 'gap'
      ? m[1].split('|')[0].trim()
      : mark === 'choice'
        ? unnumbered((m[1].split('|').find((o) => o.trim().startsWith('*')) ?? m[1].split('|')[0] ?? '').replace(/^\s*\*/, ''))
        : m[1];
  const at = m.index ?? 0;
  return { text: text.slice(0, at) + plain + text.slice(at + m[0].length), a: at, b: at + plain.length };
}

/** A piece of text with its formatting. */
export interface Styled {
  t: string;
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  href?: string;
}

// **bold**, __underlined__, *italic*, <text|https://link>, ~~struck through~~ (not nested)
const STYLE = /\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*|<([^<>|\n]+)\|(https?:\/\/[^<>\s]+)>|~~([^~\n]+)~~/g;

/** Text with **bold**, *italic* and __underlined__ in it, as styled pieces. */
export function styled(text: string): Styled[] {
  const out: Styled[] = [];
  let at = 0;
  for (const m of text.matchAll(STYLE)) {
    if (m.index > at) out.push({ t: text.slice(at, m.index) });
    if (m[1] !== undefined) out.push({ t: m[1], b: true });
    else if (m[2] !== undefined) out.push({ t: m[2], u: true });
    else if (m[3] !== undefined) out.push({ t: m[3], i: true });
    else if (m[6] !== undefined) out.push({ t: m[6], s: true });
    else out.push({ t: m[4], href: m[5] });
    at = m.index + m[0].length;
  }
  if (at < text.length || !out.length) out.push({ t: text.slice(at) });
  return out;
}

/** Each gap's accepted answers (empty: none set). */
export function gapAnswers(text: string | null): string[][] {
  return [...(text ?? '').matchAll(GAP)].map((m) => spec(m).answers);
}

function spec(m: RegExpMatchArray): { answers: string[]; options?: string[] } {
  if (m[1] !== undefined) return { answers: split(m[1]) };
  const raw = split(m[2]);
  return {
    options: raw.map((o) => unnumbered(o.replace(/^\*/, ''))),
    answers: raw.filter((o) => o.startsWith('*')).map((o) => unnumbered(o.slice(1))),
  };
}

// An option without the list mark it came with: "1. va", "b) vas", "в. ..." → "va", "vas", "..."
const MARK = /^\s*(?:\d{1,2}|[a-zа-яё])[.)]\s+/i;
export function unnumbered(option: string): string {
  return option.replace(MARK, '').trim();
}

/** A selection made into a choice's options: split at "/", "|", lines or list marks (a) b) …). */
export function asOptions(selection: string): string[] {
  const parts = selection
    .split(/\s*(?:\||\/|\n)\s*|\s+(?=(?:\d{1,2}|[a-zа-яё])[.)]\s)/i)
    .map(unnumbered)
    .filter((x) => !!x);
  return parts.length ? parts : [selection.trim()];
}

function split(inside: string): string[] {
  return inside
    .split('|')
    .map((x) => x.trim())
    .filter((x) => !!x);
}

// Case, spaces and ’ vs ' aside
function normal(s: string): string {
  return s.replace(/[’`]/g, "'").trim().toLowerCase().split(/\s+/).join(' ');
}

/** The written word / picked option is one of the answers. */
export function gapRight(answers: string[], written: string | null | undefined): boolean {
  return !!written?.trim() && answers.some((a) => normal(a) === normal(written));
}

/** A gaps block with every gap answered. */
export function gapsDone(b: LessonBlock, words: string[] | undefined): boolean {
  const count = gapAnswers(b.text).length;
  return count > 0 && Array.from({ length: count }, (_, n) => !!words?.[n]?.trim()).every(Boolean);
}

/** The students' tasks (exercises and gaps blocks): how many, how many done. */
export function taskProgress(
  blocks: LessonBlock[],
  indexes: number[] | null,
  answers: Record<number, number>,
  fills: LessonFills,
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  blocks.forEach((b, n) => {
    const i = indexes?.[n] ?? n;
    if (b.kind === 'exercise') {
      total++;
      if (answers[i] !== undefined) done++;
    } else if (b.kind === 'gaps' && gapAnswers(b.text).length) {
      total++;
      if (gapsDone(b, fills[i])) done++;
    }
  });
  return { done, total };
}
