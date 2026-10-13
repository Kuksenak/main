import { LessonBlock, LessonInput } from './lesson.service';

// A lesson as sent to the server: checked and cleaned (apart from the editor, which loads later)

/** A link as typed: "example.com/x" → "https://example.com/x"; null when it isn't a web link. */
function normalizeUrl(value: string | null): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(v) ? v : `https://${v}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Something typed in a link's address that isn't a web link. */
export function badLink(b: LessonBlock): boolean {
  return b.kind === 'link' && !!b.url?.trim() && !normalizeUrl(b.url);
}

/** Ready to save: has a title and no broken link. */
export function lessonValid(l: LessonInput): boolean {
  return !!l.title.trim() && !l.blocks.some(badLink);
}

// Trimmed, the empty ones dropped
function lines(list: string[] | null | undefined): string[] {
  return (list ?? []).map((x) => x.trim()).filter((x) => !!x);
}

/**
 * What gets saved: trimmed, links completed; empty items / answers dropped (the right answer kept
 * on its option); empty blocks dropped (an exercise needs a question and two answers).
 */
export function cleanLesson(l: LessonInput): LessonInput {
  const blocks: LessonBlock[] = [];
  for (const b of l.blocks) {
    const text = b.text?.trim() || null;
    const base = { kind: b.kind, text, url: null, private: !!b.private };
    switch (b.kind) {
      case 'checklist': {
        const items = lines(b.items);
        if (items.length) blocks.push({ ...base, text: null, items });
        break;
      }
      case 'exercise': {
        const raw = b.options ?? [];
        const options = lines(raw);
        const answer =
          b.answer != null && raw[b.answer]?.trim() ? raw.slice(0, b.answer).filter((x) => x.trim()).length : null;
        if (text && options.length >= 2) blocks.push({ ...base, options, answer });
        break;
      }
      case 'image':
        if (b.url) blocks.push({ ...base, url: b.url });
        break;
      case 'link': {
        const url = normalizeUrl(b.url);
        if (url) blocks.push({ ...base, url });
        break;
      }
      case 'gaps': {
        const instruction = b.instruction?.trim() || null;
        if (text || instruction) blocks.push({ ...base, instruction });
        break;
      }
      default:
        if (text) blocks.push(base);
    }
  }
  return { title: l.title.trim(), blocks, level: l.level ?? null };
}
