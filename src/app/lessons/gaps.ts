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
  const base: LessonBlock = { kind: 'gaps', text: null, url: null, private: !!b.private, instruction: null };
  switch (b.kind) {
    case 'gaps':
      return splitInstruction(b);
    case 'image':
      return b;
    case 'heading':
      return { ...base, instruction: b.text };
    case 'checklist':
      return { ...base, text: (b.items ?? []).join('\n') };
    case 'exercise': {
      const options = (b.options ?? []).map((o, i) => (i === b.answer ? '*' : '') + o.replace(/[|{}]/g, ' '));
      return { ...base, text: options.length ? `${b.text ?? ''} {${options.join('|')}}`.trim() : b.text };
    }
    case 'link':
      return { ...base, text: [b.text, b.url].filter((x) => !!x?.trim()).join(' ') };
    default:
      // (its first line, if there are more, the heading)
      return splitInstruction({ ...base, text: b.text });
  }
}

/** Each gap's accepted answers (empty: none set). */
export function gapAnswers(text: string | null): string[][] {
  return [...(text ?? '').matchAll(GAP)].map((m) => spec(m).answers);
}

function spec(m: RegExpMatchArray): { answers: string[]; options?: string[] } {
  if (m[1] !== undefined) return { answers: split(m[1]) };
  const raw = split(m[2]);
  return {
    options: raw.map((o) => o.replace(/^\*/, '').trim()),
    answers: raw.filter((o) => o.startsWith('*')).map((o) => o.slice(1).trim()),
  };
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
