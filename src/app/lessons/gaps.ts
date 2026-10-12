import { LessonBlock } from './lesson.service';

/** Words written in gaps blocks: block (its place in the lesson) → each gap's word, in order. */
export type LessonFills = Record<number, string[]>;

/** A line of a gaps block: plain text and gaps (numbered through the whole block, in order). */
export type GapPart = { text: string } | { gap: number; answers: string[] };

const GAP = /\[([^[\]\n]*)\]/g;

/**
 * A gaps block's text as lines of parts: "tu [envoies]; nous [envoyons]" → "tu ", gap 0
 * (envoies), "; nous ", gap 1. [colour|color]: either is right; []: no set answer.
 */
export function gapLines(text: string | null): GapPart[][] {
  let n = 0;
  return (text ?? '').split('\n').map((line) => {
    const parts: GapPart[] = [];
    let at = 0;
    for (const m of line.matchAll(GAP)) {
      if (m.index > at) parts.push({ text: line.slice(at, m.index) });
      parts.push({ gap: n++, answers: answersOf(m[1]) });
      at = m.index + m[0].length;
    }
    if (at < line.length || !parts.length) parts.push({ text: line.slice(at) });
    return parts;
  });
}

/** Each gap's accepted answers (empty: none set). */
export function gapAnswers(text: string | null): string[][] {
  return [...(text ?? '').matchAll(GAP)].map((m) => answersOf(m[1]));
}

function answersOf(inside: string): string[] {
  return inside
    .split('|')
    .map((x) => x.trim())
    .filter((x) => !!x);
}

// Case, spaces and ’ vs ' aside
function normal(s: string): string {
  return s.replace(/[’`]/g, "'").trim().toLowerCase().split(/\s+/).join(' ');
}

/** The written word is one of the answers. */
export function gapRight(answers: string[], written: string | null | undefined): boolean {
  return !!written?.trim() && answers.some((a) => normal(a) === normal(written));
}

/** A gaps block with every gap written in. */
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
    } else if (b.kind === 'gaps') {
      total++;
      if (gapsDone(b, fills[i])) done++;
    }
  });
  return { done, total };
}
