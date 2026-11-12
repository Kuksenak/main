import { Component, input } from '@angular/core';
import { TranslationKey } from '../../i18n/translations';

/** A tag's colors (as Notion's): the API's names, in the pickers' order. */
export const TAG_COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'] as const;
export type TagColor = (typeof TAG_COLORS)[number];
/** The colors offered for a tag (gray and brown no more — a tag already so keeps its color). */
export const TAG_CHOICES: readonly TagColor[] = ['orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];

// A tag's look: data-tag="green" on what wears it sets its pastel and its text (base.css: an unknown
// color, gray), read by bg-tag / text-tag-text — the same classes whatever the color.
//   <span [attr.data-tag]="tag.color" class="bg-tag text-tag-text">…</span>

/** A color's name (translations' keys). */
export const tagColorLabel = (color: TagColor): TranslationKey => `tags.${color}`;


/**
 * A tag: its name on its pastel, small and round (as Notion's). `<ui-tag color="green">A2</ui-tag>`;
 * an unknown color: gray.
 */
@Component({
  selector: 'ui-tag',
  host: {
    class: 'inline-flex h-5 max-w-40 shrink-0 items-center rounded-[0.3rem] bg-tag px-1.5 text-footnote leading-none text-tag-text',
    '[attr.data-tag]': 'color()',
  },
  template: `<span class="min-w-0 truncate"><ng-content /></span>`,
})
export class UiTag {
  readonly color = input<string>('gray');
}

/**
 * A tag's color as a small square (its pastel, round corners: 30% of its side) — its size the
 * page's: `<ui-tag-swatch [color]="tag.color" class="size-4" />`.
 */
@Component({
  selector: 'ui-tag-swatch',
  host: { class: 'block shrink-0 rounded-full bg-tag-dot', '[attr.data-tag]': 'color()' },
  template: '',
})
export class UiTagSwatch {
  readonly color = input<string>('gray');
}
