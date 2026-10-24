/**
 * A page's text keeps its formatting as marks in the text itself (as the old app's, and as the AI
 * writes it): **bold**, *italic*, __underline__, ~~strike~~, [label](https://…). The editor shows
 * the marks faded over the text (`marked`) and puts them around a selection or takes them off
 * (`toggleMark`).
 */
export type Mark = 'bold' | 'italic' | 'underline' | 'strike';

/** A piece of the text as drawn over the field: plain, a mark (faded) or a link's label. */
export interface Piece {
  t: string;
  kind?: 'syntax' | 'link';
}

const PAIRS: Record<Mark, string> = { bold: '**', italic: '*', underline: '__', strike: '~~' };

// The marks' halves (only around something, on one line), and links
const STYLE = /\*\*(?=[^*\n]+\*\*)|(?<=\*\*[^*\n]+)\*\*|__(?=[^_\n]+__)|(?<=__[^_\n]+)__|~~(?=[^~\n]+~~)|(?<=~~[^~\n]+)~~|(?<![*\w])\*(?=[^*\n]+\*(?!\*))|(?<=[^*\n])\*(?![*\w])/g;
const LINK = /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g;

/** The text as pieces to draw over the field (the same letters: only the marks faded, links colored). */
export function marked(text: string): Piece[] {
  const out: Piece[] = [];
  const plain = (t: string) => {
    let at = 0;
    for (const m of t.matchAll(STYLE)) {
      if (m.index > at) out.push({ t: t.slice(at, m.index) });
      out.push({ t: m[0], kind: 'syntax' });
      at = m.index + m[0].length;
    }
    if (at < t.length) out.push({ t: t.slice(at) });
  };
  let at = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index > at) plain(text.slice(at, m.index));
    out.push({ t: '[', kind: 'syntax' }, { t: m[1], kind: 'link' }, { t: `](${m[2]})`, kind: 'syntax' });
    at = m.index + m[0].length;
  }
  plain(text.slice(at));
  // (a last empty line still takes its height)
  out.push({ t: text.endsWith('\n') || !text ? ' ' : '' });
  return out;
}

/** The marks around the selection [a, b) (just outside it, or its own ends). */
export function marksAt(text: string, a: number, b: number): Mark[] {
  return (Object.keys(PAIRS) as Mark[]).filter((mark) => around(text, a, b, PAIRS[mark]) && !(mark === 'italic' && around(text, a, b, '**')));
}

/** The selection's mark put on (or, if it's there, taken off): the new text and where the selection now is. */
export function toggleMark(text: string, a: number, b: number, mark: Mark): { text: string; a: number; b: number } {
  const pair = PAIRS[mark];
  const found = marksAt(text, a, b).includes(mark) ? around(text, a, b, pair) : null;
  if (found) {
    return { text: text.slice(0, found.start) + found.inner + text.slice(found.end), a: found.start, b: found.start + found.inner.length };
  }
  // (the selection's spaces left outside: "**word** " not "**word **")
  while (a < b && text[a] === ' ') a++;
  while (b > a && text[b - 1] === ' ') b--;
  return { text: text.slice(0, a) + pair + text.slice(a, b) + pair + text.slice(b), a: a + pair.length, b: b + pair.length };
}

/** The selection made a link to `url` ([label](url)): the new text, the caret after it. */
export function linkSelection(text: string, a: number, b: number, url: string): { text: string; at: number } {
  const label = text.slice(a, b) || url;
  const link = `[${label}](${url})`;
  return { text: text.slice(0, a) + link + text.slice(b), at: a + link.length };
}

// A mark's pair around [a, b): just outside the selection, or the selection's own ends
function around(text: string, a: number, b: number, pair: string): { start: number; end: number; inner: string } | null {
  if (text.slice(a - pair.length, a) === pair && text.slice(b, b + pair.length) === pair) {
    return { start: a - pair.length, end: b + pair.length, inner: text.slice(a, b) };
  }
  const sel = text.slice(a, b);
  if (sel.length > pair.length * 2 && sel.startsWith(pair) && sel.endsWith(pair)) {
    return { start: a, end: b, inner: sel.slice(pair.length, sel.length - pair.length) };
  }
  return null;
}
